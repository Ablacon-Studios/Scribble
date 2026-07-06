"""
Tests for the Projects API endpoints.
"""
import json

import pytest


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


@pytest.fixture
def client(app):
    """Return a test client (use as context manager for session tracking)."""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Register a test user, then return the CSRF token for use in headers.

    Returns a tuple of (headers_dict, user_data).
    The client maintains the session cookie across requests because
    we use the same client context manager.
    """
    with client:
        resp = client.post(
            "/api/auth/register",
            data=json.dumps({
                "name": "Test User",
                "username": "testuser",
                "email": "test@example.com",
                "password": "password123",
                "confirm_password": "password123",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201
        body = resp.get_json()
        csrf_token = body["csrf_token"]
        headers = {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf_token,
        }
        return headers, body["user"]


def _create_project(client, headers, name="Test Project", strokes=None):
    """Helper: create a project and return the response JSON."""
    if strokes is None:
        strokes = [{"type": "draw", "points": [{"x": 10, "y": 20}]}]
    resp = client.post(
        "/api/projects/",
        data=json.dumps({"name": name, "strokes": strokes}),
        headers=headers,
    )
    return resp


# ---------------------------------------------------------------------------
# POST /api/projects  — Create
# ---------------------------------------------------------------------------


class TestCreateProject:
    """Tests for POST /api/projects/."""

    def test_create_with_valid_name_and_strokes(self, client, auth_headers):
        """201 status, returns project with strokes."""
        headers, _ = auth_headers
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "My Project",
                    "strokes": [
                        {"type": "draw", "points": [{"x": 10, "y": 20}]}
                    ],
                }),
                headers=headers,
            )
            assert resp.status_code == 201
            body = resp.get_json()
            assert "project" in body
            assert body["project"]["name"] == "My Project"
            assert "strokes" in body["project"]

    def test_create_with_empty_strokes_array(self, client, auth_headers):
        """201 when strokes array is empty."""
        headers, _ = auth_headers
        with client:
            resp = _create_project(client, headers, strokes=[])
            assert resp.status_code == 201
            body = resp.get_json()
            assert body["project"]["stroke_count"] == 0

    def test_create_missing_name(self, client, auth_headers):
        """400 when name is missing."""
        headers, _ = auth_headers
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "strokes": [{"type": "draw"}],
                }),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "name" in body["error"].lower()

    def test_create_empty_whitespace_name(self, client, auth_headers):
        """400 when name is empty or only whitespace."""
        headers, _ = auth_headers
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "   ",
                    "strokes": [{"type": "draw"}],
                }),
                headers=headers,
            )
            assert resp.status_code == 400

    def test_create_name_exceeds_200_chars(self, client, auth_headers):
        """400 when name exceeds 200 characters."""
        headers, _ = auth_headers
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "A" * 201,
                    "strokes": [{"type": "draw"}],
                }),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "200" in body["error"]

    def test_create_missing_strokes(self, client, auth_headers):
        """400 when strokes field is missing."""
        headers, _ = auth_headers
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({"name": "Test"}),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "strokes" in body["error"].lower()

    def test_create_strokes_not_array(self, client, auth_headers):
        """400 when strokes is not an array."""
        headers, _ = auth_headers
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "Test",
                    "strokes": "not-an-array",
                }),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "array" in body["error"].lower()

    def test_create_unauthenticated(self, client):
        """401 when not authenticated."""
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "Test",
                    "strokes": [{"type": "draw"}],
                }),
                content_type="application/json",
            )
            assert resp.status_code == 401

    def test_create_invalid_csrf(self, client, auth_headers):
        """403 when CSRF token is missing."""
        headers, _ = auth_headers
        with client:
            # The user IS authenticated (session exists), but no X-CSRF-Token header
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "Test",
                    "strokes": [{"type": "draw"}],
                }),
                content_type="application/json",  # no X-CSRF-Token
            )
            assert resp.status_code == 403

    def test_create_wrong_csrf_token(self, client, auth_headers):
        """403 when a forged/wrong CSRF token value is sent."""
        headers, _ = auth_headers
        with client:
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "Test",
                    "strokes": [{"type": "draw"}],
                }),
                headers={
                    "Content-Type": "application/json",
                    "X-CSRF-Token": "forged-token-value",
                },
            )
            assert resp.status_code == 403

    def test_create_oversized_payload(self, client, auth_headers):
        """413 when payload exceeds MAX_CONTENT_LENGTH (~6 MB)."""
        headers, _ = auth_headers
        with client:
            # Generate a payload that is definitely > 6 MB
            large_strokes = [
                {"type": "draw", "points": [{"x": i, "y": i}]}
                for i in range(200000)
            ]
            resp = client.post(
                "/api/projects/",
                data=json.dumps({
                    "name": "Huge",
                    "strokes": large_strokes,
                }),
                headers=headers,
            )
            assert resp.status_code == 413


# ---------------------------------------------------------------------------
# GET /api/projects  — List
# ---------------------------------------------------------------------------


class TestListProjects:
    """Tests for GET /api/projects/."""

    def test_list_projects_for_auth_user(self, client, auth_headers):
        """200 with projects array for the authenticated user."""
        headers, user = auth_headers
        with client:
            # Create 2 projects
            _create_project(client, headers, "Project A")
            _create_project(client, headers, "Project B")

            resp = client.get("/api/projects/")
            assert resp.status_code == 200
            body = resp.get_json()
            assert "projects" in body
            assert len(body["projects"]) == 2
            assert body["projects"][0]["name"] in ("Project A", "Project B")

    def test_list_with_pagination_metadata(self, client, auth_headers):
        """200 returns page, per_page, total, pages."""
        headers, _ = auth_headers
        with client:
            # Create 3 projects
            for i in range(3):
                _create_project(client, headers, f"Project {i}")

            resp = client.get("/api/projects/?page=1&per_page=2")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["page"] == 1
            assert body["per_page"] == 2
            assert body["total"] == 3
            assert body["pages"] == 2
            assert len(body["projects"]) == 2

    def test_list_excludes_strokes_data(self, client, auth_headers):
        """List items must NOT include a 'strokes' field."""
        headers, _ = auth_headers
        with client:
            _create_project(client, headers, "Strokes Project")

            resp = client.get("/api/projects/")
            assert resp.status_code == 200
            body = resp.get_json()
            for project in body["projects"]:
                assert "strokes" not in project
                assert "stroke_count" in project

    def test_list_empty_for_user_with_no_projects(self, client, auth_headers):
        """200 with empty array when user has no projects."""
        headers, _ = auth_headers
        with client:
            resp = client.get("/api/projects/")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["projects"] == []
            assert body["total"] == 0

    def test_list_unauthenticated(self, client):
        """401 when not authenticated."""
        with client:
            resp = client.get("/api/projects/")
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/projects/<id>  — Get single project
# ---------------------------------------------------------------------------


class TestGetProject:
    """Tests for GET /api/projects/<id>."""

    def test_get_own_project(self, client, auth_headers):
        """200 returns project with strokes."""
        headers, _ = auth_headers
        with client:
            create_resp = _create_project(client, headers, "My Project")
            project_id = create_resp.get_json()["project"]["id"]

            resp = client.get(f"/api/projects/{project_id}")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["project"]["name"] == "My Project"
            assert "strokes" in body["project"]

    def test_get_nonexistent(self, client, auth_headers):
        """404 when project does not exist."""
        headers, _ = auth_headers
        with client:
            resp = client.get("/api/projects/99999")
            assert resp.status_code == 404

    def test_get_another_users_project(self, client, auth_headers, app):
        """404 when trying to get a project owned by a different user."""
        headers, user_data = auth_headers

        # Create a second user and their project
        with app.app_context():
            from extensions import db
            from models import User, Project

            user2 = User(
                name="Other User",
                username="otheruser",
                email="other@example.com",
            )
            user2.set_password("password123")
            db.session.add(user2)
            db.session.commit()

            project = Project(
                name="Other Project",
                strokes_json=Project.serialize_strokes([]),
                user_id=user2.id,
            )
            db.session.add(project)
            db.session.commit()
            other_project_id = project.id

        with client:
            resp = client.get(f"/api/projects/{other_project_id}")
            assert resp.status_code == 404

    def test_get_unauthenticated(self, client):
        """401 when not authenticated."""
        with client:
            resp = client.get("/api/projects/1")
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PUT /api/projects/<id>  — Update project
# ---------------------------------------------------------------------------


class TestUpdateProject:
    """Tests for PUT /api/projects/<id>."""

    def test_update_strokes_only(self, client, auth_headers):
        """200 when updating strokes only."""
        headers, _ = auth_headers
        with client:
            create_resp = _create_project(client, headers, "Update Me")
            project_id = create_resp.get_json()["project"]["id"]

            new_strokes = [{"type": "draw", "points": [{"x": 99, "y": 99}]}]
            resp = client.put(
                f"/api/projects/{project_id}",
                data=json.dumps({"strokes": new_strokes}),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["project"]["stroke_count"] == 1

    def test_update_name_only(self, client, auth_headers):
        """200 when updating name only."""
        headers, _ = auth_headers
        with client:
            create_resp = _create_project(client, headers, "Old Name")
            project_id = create_resp.get_json()["project"]["id"]

            resp = client.put(
                f"/api/projects/{project_id}",
                data=json.dumps({"name": "New Name"}),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["project"]["name"] == "New Name"

    def test_update_both(self, client, auth_headers):
        """200 when updating both name and strokes."""
        headers, _ = auth_headers
        with client:
            create_resp = _create_project(client, headers, "Original")
            project_id = create_resp.get_json()["project"]["id"]

            new_strokes = [{"type": "erase", "points": [{"x": 1, "y": 1}]}]
            resp = client.put(
                f"/api/projects/{project_id}",
                data=json.dumps({"name": "Updated Both", "strokes": new_strokes}),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["project"]["name"] == "Updated Both"
            assert body["project"]["stroke_count"] == 1

    def test_update_no_fields_provided(self, client, auth_headers):
        """400 when no fields are provided in the body."""
        headers, _ = auth_headers
        with client:
            create_resp = _create_project(client, headers, "Empty Update")
            project_id = create_resp.get_json()["project"]["id"]

            resp = client.put(
                f"/api/projects/{project_id}",
                data=json.dumps({}),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "At least one" in body["error"]

    def test_update_another_users_project(self, client, auth_headers, app):
        """404 when updating a project owned by another user."""
        headers, _ = auth_headers

        # Create another user's project
        with app.app_context():
            from extensions import db
            from models import User, Project

            user2 = User(
                name="Other", username="other2",
                email="other2@example.com",
            )
            user2.set_password("password123")
            db.session.add(user2)
            db.session.commit()

            project = Project(
                name="Other Project",
                strokes_json=Project.serialize_strokes([]),
                user_id=user2.id,
            )
            db.session.add(project)
            db.session.commit()
            other_project_id = project.id

        with client:
            resp = client.put(
                f"/api/projects/{other_project_id}",
                data=json.dumps({"name": "Hacked"}),
                headers=headers,
            )
            assert resp.status_code == 404

    def test_update_nonexistent(self, client, auth_headers):
        """404 when project does not exist."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/projects/99999",
                data=json.dumps({"name": "Ghost"}),
                headers=headers,
            )
            assert resp.status_code == 404

    def test_update_unauthenticated(self, client):
        """401 when not authenticated."""
        with client:
            resp = client.put(
                "/api/projects/1",
                data=json.dumps({"name": "Test"}),
                content_type="application/json",
            )
            assert resp.status_code == 401

    def test_update_invalid_csrf(self, client, auth_headers):
        """403 when CSRF token is missing."""
        headers, _ = auth_headers
        with client:
            # Must first create a project so we have a valid project_id
            create_resp = _create_project(client, headers, "CSRF Test")
            project_id = create_resp.get_json()["project"]["id"]

            # Now try to update without CSRF header
            resp = client.put(
                f"/api/projects/{project_id}",
                data=json.dumps({"name": "No CSRF"}),
                content_type="application/json",
            )
            assert resp.status_code == 403


# ---------------------------------------------------------------------------
# DELETE /api/projects/<id>  — Delete project
# ---------------------------------------------------------------------------


class TestDeleteProject:
    """Tests for DELETE /api/projects/<id>."""

    def test_delete_own_project(self, client, auth_headers):
        """200 when deleting own project."""
        headers, _ = auth_headers
        with client:
            create_resp = _create_project(client, headers, "Delete Me")
            project_id = create_resp.get_json()["project"]["id"]

            resp = client.delete(
                f"/api/projects/{project_id}",
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "deleted successfully" in body["message"].lower()

            # Verify it's gone
            get_resp = client.get(f"/api/projects/{project_id}")
            assert get_resp.status_code == 404

    def test_delete_nonexistent(self, client, auth_headers):
        """404 when project does not exist."""
        headers, _ = auth_headers
        with client:
            resp = client.delete(
                "/api/projects/99999",
                headers=headers,
            )
            assert resp.status_code == 404

    def test_delete_another_users_project(self, client, auth_headers, app):
        """404 when deleting a project owned by another user."""
        headers, _ = auth_headers

        # Create another user's project
        with app.app_context():
            from extensions import db
            from models import User, Project

            user2 = User(
                name="Other Del", username="otherdel",
                email="otherdel@example.com",
            )
            user2.set_password("password123")
            db.session.add(user2)
            db.session.commit()

            project = Project(
                name="Other Project",
                strokes_json=Project.serialize_strokes([]),
                user_id=user2.id,
            )
            db.session.add(project)
            db.session.commit()
            other_project_id = project.id

        with client:
            resp = client.delete(
                f"/api/projects/{other_project_id}",
                headers=headers,
            )
            assert resp.status_code == 404

    def test_delete_unauthenticated(self, client):
        """401 when not authenticated."""
        with client:
            resp = client.delete("/api/projects/1")
            assert resp.status_code == 401

    def test_delete_invalid_csrf(self, client, auth_headers):
        """403 when CSRF token is missing."""
        headers, _ = auth_headers
        with client:
            create_resp = _create_project(client, headers, "Del CSRF Test")
            project_id = create_resp.get_json()["project"]["id"]

            resp = client.delete(
                f"/api/projects/{project_id}",
                # no headers with CSRF token
            )
            assert resp.status_code == 403
