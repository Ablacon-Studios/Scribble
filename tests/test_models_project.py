"""
Tests for the Project ORM model.
"""
import pytest
import json as _json
import time


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def app(monkeypatch):
    """Create a Flask app with an in-memory SQLite database for testing."""
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")

    from app import create_app
    flask_app, _ = create_app()
    flask_app.config["TESTING"] = True

    with flask_app.app_context():
        from extensions import db
        db.drop_all()
        db.create_all()

    return flask_app


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------


def test_create_project_success(app):
    """Creating a project with valid data should persist all fields correctly."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Project Tester",
            username="projectuser",
            email="project@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="My Drawing",
            strokes_json=Project.serialize_strokes([
                {"points": [{"x": 10, "y": 20}], "color": "#000000"}
            ]),
            canvas_width=800,
            canvas_height=500,
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        fetched = db.session.get(Project, project.id)
        assert fetched is not None
        assert fetched.name == "My Drawing"
        assert fetched.canvas_width == 800
        assert fetched.canvas_height == 500
        assert fetched.user_id == user.id
        assert fetched.created_at is not None
        assert fetched.updated_at is not None


def test_project_user_relationship(app):
    """Project.user returns the owner; User.projects includes the project."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Rel Tester",
            username="reluser",
            email="rel@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Relationship Test",
            strokes_json=Project.serialize_strokes([]),
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        # Forward relationship
        assert project.user.id == user.id

        # Backref relationship
        assert project in user.projects
        assert len(user.projects) == 1


def test_project_to_dict_without_strokes(app):
    """to_dict() without include_strokes omits strokes, includes stroke_count."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Dict Tester",
            username="dictuser",
            email="dict@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Dict Test",
            strokes_json=Project.serialize_strokes([
                {"points": [{"x": 1, "y": 2}]},
                {"points": [{"x": 3, "y": 4}]},
            ]),
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        data = project.to_dict()
        assert "strokes" not in data
        assert data["stroke_count"] == 2
        assert data["name"] == "Dict Test"
        assert data["id"] == project.id


def test_project_to_dict_with_strokes(app):
    """to_dict(include_strokes=True) includes parsed strokes array."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Strokes Tester",
            username="strokesusr",
            email="strokes@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        strokes_payload = [
            {"points": [{"x": 10, "y": 20}], "color": "#ff0000"}
        ]
        project = Project(
            name="Strokes Test",
            strokes_json=Project.serialize_strokes(strokes_payload),
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        data = project.to_dict(include_strokes=True)
        assert "strokes" in data
        # The strokes field is the parsed envelope containing version + strokes
        parsed = data["strokes"]
        assert isinstance(parsed, dict)
        assert parsed["version"] == 1
        assert parsed["strokes"] == strokes_payload


def test_project_stroke_count(app):
    """_stroke_count() returns the correct number of strokes."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Count Tester",
            username="countuser",
            email="count@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Count Test",
            strokes_json=Project.serialize_strokes([
                {"type": "draw"}, {"type": "draw"}, {"type": "erase"}
            ]),
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        assert project._stroke_count() == 3


def test_project_stroke_count_empty(app):
    """_stroke_count() returns 0 for an empty strokes array."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Empty Tester",
            username="emptyuser",
            email="empty@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Empty Test",
            strokes_json=Project.serialize_strokes([]),
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        assert project._stroke_count() == 0


def test_project_cascade_delete(app):
    """Deleting a user cascades and deletes their projects."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Cascade Tester",
            username="cascadeusr",
            email="cascade@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Cascade Test",
            strokes_json=Project.serialize_strokes([]),
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        assert Project.query.count() == 1

        db.session.delete(user)
        db.session.commit()

        assert Project.query.count() == 0


def test_project_updated_at_auto_update(app):
    """updated_at should change on subsequent saves."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Update Tester",
            username="updateusr",
            email="update@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Update Test",
            strokes_json=Project.serialize_strokes([]),
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        original_updated_at = project.updated_at

        # Wait a tiny bit to ensure the timestamp changes
        time.sleep(0.01)

        project.name = "Updated Name"
        db.session.commit()

        assert project.updated_at != original_updated_at
        assert project.updated_at > original_updated_at


def test_project_stroke_count_invalid_json(app):
    """_stroke_count() returns 0 when strokes_json contains malformed JSON."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Corrupt Tester",
            username="corruptjson",
            email="corrupt@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Corrupt JSON Test",
            strokes_json="not valid json {{{",
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        # _stroke_count should handle corrupt JSON gracefully and return 0
        assert project._stroke_count() == 0


def test_project_to_dict_corrupt_json_with_strokes(app):
    """to_dict(include_strokes=True) returns strokes: [] when strokes_json is corrupt."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="Corrupt Dict Tester",
            username="corruptdict",
            email="corruptdict@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Corrupt Dict Test",
            strokes_json="}{invalid json{{{",
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        data = project.to_dict(include_strokes=True)
        assert "strokes" in data
        assert data["strokes"] == []
        assert data["stroke_count"] == 0


def test_project_stroke_count_none_type_json(app):
    """_stroke_count() returns 0 when JSON parses to a non-dict value."""
    from extensions import db
    from models import User, Project

    with app.app_context():
        user = User(
            name="NoneType Tester",
            username="nonetypes",
            email="nonetype@example.com",
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        project = Project(
            name="Non-Dict JSON",
            strokes_json="null",
            user_id=user.id,
        )
        db.session.add(project)
        db.session.commit()

        # null is valid JSON but not a dict — should return 0
        assert project._stroke_count() == 0
