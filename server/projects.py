"""Projects blueprint — CRUD endpoints for user drawing projects."""

from flask import Blueprint, jsonify, request

# NOTE: _error, _get_current_user, _require_auth, _require_csrf are private
# module helpers from auth.py.  They are imported here rather than extracted
# to a shared helpers module to keep the refactor surface small.
from auth import _error, _get_current_user, _require_auth, _require_csrf
from extensions import db, limiter
from models import Project

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_user_project(project_id: int) -> Project | None:
    """Load a project and verify it belongs to the current user.

    Returns ``None`` when the user is not authenticated or the project
    does not exist / is owned by someone else.
    """
    user = _get_current_user()
    if user is None:
        return None
    return Project.query.filter_by(id=project_id, user_id=user.id).first()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@projects_bp.route("/", methods=["POST"])
@_require_auth
@_require_csrf
@limiter.limit("10 per minute")
def create_project():
    """Create a new project for the authenticated user."""
    data = request.get_json(silent=True) or {}

    # -- Validate name -------------------------------------------------------
    name = data.get("name", "")
    if isinstance(name, str):
        name = name.strip()
    if not name:
        return _error("Project name is required", 400)
    if len(name) > 200:
        return _error("Project name must be at most 200 characters", 400)

    # -- Validate strokes ----------------------------------------------------
    strokes = data.get("strokes")
    if strokes is None:
        return _error("Strokes data is required", 400)
    if not isinstance(strokes, list):
        return _error("Strokes must be a JSON array", 400)

    # -- Optional canvas dimensions ------------------------------------------
    canvas_width = data.get("canvas_width", None)
    if canvas_width is not None:
        try:
            canvas_width = int(canvas_width)
            if canvas_width < 1:
                return _error("Canvas width must be positive", 400)
        except (TypeError, ValueError):
            return _error("Canvas width must be an integer", 400)

    canvas_height = data.get("canvas_height", None)
    if canvas_height is not None:
        try:
            canvas_height = int(canvas_height)
            if canvas_height < 1:
                return _error("Canvas height must be positive", 400)
        except (TypeError, ValueError):
            return _error("Canvas height must be an integer", 400)

    # -- Persist -------------------------------------------------------------
    user = _get_current_user()
    project = Project(
        name=name,
        strokes_json=Project.serialize_strokes(
            strokes, canvas_w=canvas_width, canvas_h=canvas_height,
        ),
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        user_id=user.id,
    )
    db.session.add(project)
    db.session.commit()

    return jsonify({"project": project.to_dict(include_strokes=True)}), 201


@projects_bp.route("/", methods=["GET"])
@_require_auth
@limiter.limit("30 per minute")
def list_projects():
    """Return paginated projects for the authenticated user, newest first."""
    user = _get_current_user()

    # Pagination query args
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
    except (TypeError, ValueError):
        page = 1
        per_page = 20
    page = max(1, page)
    per_page = max(1, min(50, per_page))

    pagination = (
        Project.query
        .filter_by(user_id=user.id)
        .order_by(Project.updated_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify({
        "projects": [p.to_dict() for p in pagination.items],
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }), 200


@projects_bp.route("/<int:project_id>", methods=["GET"])
@_require_auth
@limiter.limit("30 per minute")
def get_project(project_id: int):
    """Return a single project with its full strokes data."""
    project = _get_user_project(project_id)
    if project is None:
        return _error("Project not found", 404)
    return jsonify({"project": project.to_dict(include_strokes=True)}), 200


@projects_bp.route("/<int:project_id>", methods=["PUT"])
@_require_auth
@_require_csrf
@limiter.limit("10 per minute")
def update_project(project_id: int):
    """Update an existing project (partial — any combination of fields)."""
    project = _get_user_project(project_id)
    if project is None:
        return _error("Project not found", 404)

    data = request.get_json(silent=True) or {}

    name = data.get("name", None)
    strokes = data.get("strokes", None)
    canvas_width = data.get("canvas_width", None)
    canvas_height = data.get("canvas_height", None)

    # -- At least one field must be provided --------------------------------
    provided = [v for v in (name, strokes, canvas_width, canvas_height)
                if v is not None]
    if not provided:
        return _error(
            "At least one of 'name', 'strokes', 'canvas_width', "
            "or 'canvas_height' must be provided",
            400,
        )

    # -- Validate and apply name --------------------------------------------
    if name is not None:
        if isinstance(name, str):
            name = name.strip()
        if not name:
            return _error("Project name must not be empty", 400)
        if len(name) > 200:
            return _error("Project name must be at most 200 characters", 400)
        project.name = name

    # -- Validate and apply strokes -----------------------------------------
    if strokes is not None:
        if not isinstance(strokes, list):
            return _error("Strokes must be a JSON array", 400)
        project.strokes_json = Project.serialize_strokes(
            strokes, canvas_w=canvas_width, canvas_h=canvas_height,
        )

    # -- Optional canvas dimensions -----------------------------------------
    if canvas_width is not None:
        try:
            canvas_width = int(canvas_width)
            if canvas_width < 1:
                return _error("Canvas width must be positive", 400)
        except (TypeError, ValueError):
            return _error("Canvas width must be an integer", 400)
        project.canvas_width = canvas_width

    if canvas_height is not None:
        try:
            canvas_height = int(canvas_height)
            if canvas_height < 1:
                return _error("Canvas height must be positive", 400)
        except (TypeError, ValueError):
            return _error("Canvas height must be an integer", 400)
        project.canvas_height = canvas_height

    db.session.commit()
    return jsonify({"project": project.to_dict(include_strokes=True)}), 200


@projects_bp.route("/<int:project_id>", methods=["DELETE"])
@_require_auth
@_require_csrf
@limiter.limit("10 per minute")
def delete_project(project_id: int):
    """Permanently delete a project."""
    project = _get_user_project(project_id)
    if project is None:
        return _error("Project not found", 404)

    db.session.delete(project)
    db.session.commit()
    return jsonify({"message": "Project deleted successfully"}), 200
