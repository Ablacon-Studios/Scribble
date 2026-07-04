"""
Tests for the authentication API endpoints.
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


# ---------------------------------------------------------------------------
# Helper: create a pre-authenticated client
# ---------------------------------------------------------------------------


@pytest.fixture
def auth_headers(client):
    """Register a test user, then return the CSRF token for use in headers.

    Returns a tuple of (headers_dict, user_data).
    The client maintains the session cookie across requests because
    we use the same client context manager.
    """
    with client:
        # Step 1: Register a new user (this also logs them in and returns CSRF)
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


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------


class TestRegister:
    """Tests for POST /api/auth/register."""

    def test_register_success(self, client):
        """201 status, returns user + csrf_token, session created."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "John Doe",
                    "username": "johndoe",
                    "email": "john@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            body = resp.get_json()
            assert "user" in body
            assert body["user"]["username"] == "johndoe"
            assert body["user"]["email"] == "john@example.com"
            assert "csrf_token" in body
            assert len(body["csrf_token"]) > 0

    def test_register_missing_name(self, client):
        """400 error when name is missing."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "username": "test1",
                    "email": "test1@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "name" in body["error"].lower()

    def test_register_missing_username(self, client):
        """400 when username is missing."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Test",
                    "email": "test2@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            # The validator will catch blank username (length < 3)
            assert "username" in body["error"].lower()

    def test_register_missing_email(self, client):
        """400 when email is missing."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Test",
                    "username": "test3",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "email" in body["error"].lower()

    def test_register_missing_password(self, client):
        """400 when password is missing."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Test",
                    "username": "test4",
                    "email": "test4@example.com",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "password" in body["error"].lower()

    def test_register_password_mismatch(self, client):
        """400 when passwords do not match."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Test",
                    "username": "test5",
                    "email": "test5@example.com",
                    "password": "secure123",
                    "confirm_password": "different456",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Passwords do not match" in body["error"]

    def test_register_short_password(self, client):
        """400 when password is shorter than 8 characters."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Test",
                    "username": "test6",
                    "email": "test6@example.com",
                    "password": "short",
                    "confirm_password": "short",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "at least 8" in body["error"].lower()

    def test_register_duplicate_username(self, client):
        """409 when username is already taken."""
        with client:
            # Create first user
            resp1 = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "First",
                    "username": "dupeuser",
                    "email": "first@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp1.status_code == 201

            # Try to create second user with same username
            resp2 = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Second",
                    "username": "dupeuser",
                    "email": "second@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp2.status_code == 409
            body = resp2.get_json()
            assert "Username is already taken" in body["error"]

    def test_register_duplicate_email(self, client):
        """409 when email is already registered."""
        with client:
            # Create first user
            resp1 = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "First",
                    "username": "user1",
                    "email": "dupe@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp1.status_code == 201

            # Try to create second user with same email
            resp2 = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Second",
                    "username": "user2",
                    "email": "dupe@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp2.status_code == 409
            body = resp2.get_json()
            assert "Email is already registered" in body["error"]

    def test_register_invalid_email(self, client):
        """400 when email format is invalid."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Test",
                    "username": "test7",
                    "email": "not-an-email",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "email" in body["error"].lower()

    def test_register_invalid_username_format(self, client):
        """400 when username contains invalid characters."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Test",
                    "username": "bad user!",
                    "email": "test8@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "username" in body["error"].lower()

    def test_register_auto_login(self, client):
        """After registration, GET /me returns the user (auto-login)."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Jane",
                    "username": "jane",
                    "email": "jane@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201

            # Now check /me
            me_resp = client.get("/api/auth/me")
            assert me_resp.status_code == 200
            body = me_resp.get_json()
            assert body["user"]["username"] == "jane"


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------


class TestLogin:
    """Tests for POST /api/auth/login."""

    def _register_user(self, client):
        """Helper: register a user and return the client (still in session)."""
        client.post(
            "/api/auth/register",
            data=json.dumps({
                "name": "Login Test",
                "username": "logintest",
                "email": "logintest@example.com",
                "password": "mypassword",
                "confirm_password": "mypassword",
            }),
            content_type="application/json",
        )
        # Logout so we can test login fresh
        resp = client.get("/api/auth/csrf")
        csrf = resp.get_json()["csrf_token"]
        client.post(
            "/api/auth/logout",
            headers={"X-CSRF-Token": csrf},
        )

    def test_login_with_username(self, client):
        """200 with username, returns user + csrf_token."""
        with client:
            self._register_user(client)

            resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "logintest",
                    "password": "mypassword",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "user" in body
            assert body["user"]["username"] == "logintest"
            assert "csrf_token" in body

    def test_login_with_email(self, client):
        """200 with email as identifier."""
        with client:
            self._register_user(client)

            resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "logintest@example.com",
                    "password": "mypassword",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["user"]["email"] == "logintest@example.com"

    def test_login_wrong_password(self, client):
        """401 for wrong password, generic message."""
        with client:
            self._register_user(client)

            resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "logintest",
                    "password": "wrongpassword",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 401
            body = resp.get_json()
            assert "Invalid username/email or password" in body["error"]

    def test_login_nonexistent_user(self, client):
        """401 for non-existent user, same generic message."""
        with client:
            resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "nobody",
                    "password": "whatever",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 401
            body = resp.get_json()
            assert "Invalid username/email or password" in body["error"]

    def test_login_missing_fields(self, client):
        """400 when identifier or password is missing."""
        with client:
            resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "",
                    "password": "",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "username/email and password are required" in body["error"].lower()

    def test_login_creates_session(self, client):
        """After login, GET /me returns the user."""
        with client:
            self._register_user(client)

            resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "logintest",
                    "password": "mypassword",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200

            me_resp = client.get("/api/auth/me")
            assert me_resp.status_code == 200
            assert me_resp.get_json()["user"]["username"] == "logintest"


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------


class TestLogout:
    """Tests for POST /api/auth/logout."""

    def _get_csrf(self, client):
        resp = client.get("/api/auth/csrf")
        return resp.get_json()["csrf_token"]

    def test_logout_success(self, client, auth_headers):
        """200 returns 'Logged out successfully'."""
        headers, _ = auth_headers
        with client:
            resp = client.post("/api/auth/logout", headers=headers)
            assert resp.status_code == 200
            body = resp.get_json()
            assert "Logged out successfully" in body["message"]

    def test_logout_clears_session(self, client, auth_headers):
        """After logout, GET /me returns 401."""
        headers, _ = auth_headers
        with client:
            resp = client.post("/api/auth/logout", headers=headers)
            assert resp.status_code == 200

            me_resp = client.get("/api/auth/me")
            assert me_resp.status_code == 401

    def test_logout_no_auth(self, client):
        """401 when not authenticated."""
        with client:
            csrf = self._get_csrf(client)
            resp = client.post(
                "/api/auth/logout",
                headers={"X-CSRF-Token": csrf},
            )
            assert resp.status_code == 401

    def test_logout_no_csrf(self, client, auth_headers):
        """403 when missing CSRF token. Our auth_headers already registers
        the user, so we call logout without X-CSRF-Token."""
        # Note: The auth_headers fixture creates the user and session.
        # We need to re-use the same client session but make a request
        # without the CSRF header. However the logout route checks
        # _require_auth first, then _require_csrf. Since we have a fresh
        # session, _require_auth passes. But we've already obtained the
        # CSRF from registration — we need a scenario where the session
        # exists but CSRF is missing from header. We can use the session
        # from auth_headers (which has a user_id in session) but omit
        # the X-CSRF-Token header.
        with client:
            resp = client.post("/api/auth/logout")
            assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------


class TestMe:
    """Tests for GET /api/auth/me."""

    def test_me_authenticated(self, client, auth_headers):
        """200 returns user object when authenticated."""
        headers, user_data = auth_headers
        with client:
            resp = client.get("/api/auth/me")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["user"]["username"] == user_data["username"]

    def test_me_unauthenticated(self, client):
        """401 when not authenticated."""
        with client:
            resp = client.get("/api/auth/me")
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PUT /api/auth/password
# ---------------------------------------------------------------------------


class TestChangePassword:
    """Tests for PUT /api/auth/password."""

    def test_change_password_success(self, client, auth_headers):
        """200 when changing password successfully."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "password123",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123",
                }),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "Password changed successfully" in body["message"]

    def test_change_password_wrong_current(self, client, auth_headers):
        """403 when current password is incorrect."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "wrongpassword",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123",
                }),
                headers=headers,
            )
            assert resp.status_code == 403
            body = resp.get_json()
            assert "Current password is incorrect" in body["error"]

    def test_change_password_mismatch(self, client, auth_headers):
        """400 when new password and confirm do not match."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "password123",
                    "new_password": "newpassword123",
                    "confirm_password": "different456",
                }),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Passwords do not match" in body["error"]

    def test_change_password_short(self, client, auth_headers):
        """400 when new password is too short."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "password123",
                    "new_password": "short",
                    "confirm_password": "short",
                }),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "at least 8" in body["error"].lower()

    def test_change_password_no_auth(self, client):
        """401 when not authenticated."""
        with client:
            csrf_resp = client.get("/api/auth/csrf")
            csrf = csrf_resp.get_json()["csrf_token"]
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "pass",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123",
                }),
                headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
            )
            assert resp.status_code == 401

    def test_change_password_no_csrf(self, client, auth_headers):
        """403 when CSRF token is missing."""
        headers, _ = auth_headers
        with client:
            # The session has the user logged in, but we omit the X-CSRF-Token header
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "password123",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 403


# ---------------------------------------------------------------------------
# PUT /api/auth/email
# ---------------------------------------------------------------------------


class TestChangeEmail:
    """Tests for PUT /api/auth/email."""

    def test_change_email_success(self, client, auth_headers):
        """200 returns updated user."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/email",
                data=json.dumps({
                    "new_email": "newemail@example.com",
                    "password": "password123",
                }),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["user"]["email"] == "newemail@example.com"
            assert "Email changed successfully" in body["message"]

    def test_change_email_wrong_password(self, client, auth_headers):
        """403 when current password is incorrect."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/email",
                data=json.dumps({
                    "new_email": "newemail@example.com",
                    "password": "wrongpassword",
                }),
                headers=headers,
            )
            assert resp.status_code == 403
            body = resp.get_json()
            assert "Current password is incorrect" in body["error"]

    def test_change_email_already_taken(self, client, auth_headers):
        """409 when email is already taken by another user."""
        headers, _ = auth_headers
        with client:
            # Register a second user with a different email first
            # (must use a separate client context to avoid mixing sessions)
            pass

        # Actually we need to create a second user within the same session.
        # We can do this by getting a fresh CSRF after registration.
        # Simpler approach: use two client sessions.
        # For simplicity: register another user via a fresh client, then test
        # the email change on the first user.

        # Register another user with the target email
        with client:
            # First, login as testuser and get their CSRF
            client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Another",
                    "username": "anotheruser",
                    "email": "another@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )

        # Now try to change the original user's email to "another@example.com"
        with client:
            # Login as testuser
            login_resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "testuser",
                    "password": "password123",
                }),
                content_type="application/json",
            )
            csrf = login_resp.get_json()["csrf_token"]
            headers = {"Content-Type": "application/json", "X-CSRF-Token": csrf}

            resp = client.put(
                "/api/auth/email",
                data=json.dumps({
                    "new_email": "another@example.com",
                    "password": "password123",
                }),
                headers=headers,
            )
            assert resp.status_code == 409
            body = resp.get_json()
            assert "Email is already registered" in body["error"]

    def test_change_email_invalid_format(self, client, auth_headers):
        """400 when email format is invalid."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/email",
                data=json.dumps({
                    "new_email": "not-an-email",
                    "password": "password123",
                }),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "email" in body["error"].lower()

    def test_change_email_no_auth(self, client):
        """401 when not authenticated."""
        with client:
            csrf_resp = client.get("/api/auth/csrf")
            csrf = csrf_resp.get_json()["csrf_token"]
            resp = client.put(
                "/api/auth/email",
                data=json.dumps({
                    "new_email": "test@example.com",
                    "password": "whatever",
                }),
                headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
            )
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PUT /api/auth/profile
# ---------------------------------------------------------------------------


class TestUpdateProfile:
    """Tests for PUT /api/auth/profile."""

    def test_update_profile_name(self, client, auth_headers):
        """200, name updated."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/profile",
                data=json.dumps({"name": "New Name"}),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["user"]["name"] == "New Name"

    def test_update_profile_username(self, client, auth_headers):
        """200, username updated."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/profile",
                data=json.dumps({"username": "newusername"}),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["user"]["username"] == "newusername"

    def test_update_profile_both(self, client, auth_headers):
        """200, both name and username updated."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/profile",
                data=json.dumps({"name": "New Name", "username": "newname"}),
                headers=headers,
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["user"]["name"] == "New Name"
            assert body["user"]["username"] == "newname"

    def test_update_profile_no_fields(self, client, auth_headers):
        """400 when no fields provided."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/profile",
                data=json.dumps({}),
                headers=headers,
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "At least one" in body["error"]

    def test_update_profile_username_taken(self, client, auth_headers):
        """409 when username is taken by another user."""
        headers, _ = auth_headers
        with client:
            # Register another user with a different username
            # (create within this session by logging out then registering, or
            # use a separate context)

            # Register second user via fresh context
            client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Other",
                    "username": "otheruser",
                    "email": "other@example.com",
                    "password": "secure123",
                    "confirm_password": "secure123",
                }),
                content_type="application/json",
            )

        # Now login as testuser and try to change username to "otheruser"
        with client:
            login_resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "testuser",
                    "password": "password123",
                }),
                content_type="application/json",
            )
            csrf = login_resp.get_json()["csrf_token"]
            headers = {"Content-Type": "application/json", "X-CSRF-Token": csrf}

            resp = client.put(
                "/api/auth/profile",
                data=json.dumps({"username": "otheruser"}),
                headers=headers,
            )
            assert resp.status_code == 409
            body = resp.get_json()
            assert "Username is already taken" in body["error"]

    def test_update_profile_no_auth(self, client):
        """401 when not authenticated."""
        with client:
            csrf_resp = client.get("/api/auth/csrf")
            csrf = csrf_resp.get_json()["csrf_token"]
            resp = client.put(
                "/api/auth/profile",
                data=json.dumps({"name": "Test"}),
                headers={"X-CSRF-Token": csrf, "Content-Type": "application/json"},
            )
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/auth/csrf
# ---------------------------------------------------------------------------


class TestCsrf:
    """Tests for GET /api/auth/csrf."""

    def test_csrf_token_endpoint(self, client):
        """200 returns a csrf_token string."""
        with client:
            resp = client.get("/api/auth/csrf")
            assert resp.status_code == 200
            body = resp.get_json()
            assert "csrf_token" in body
            assert len(body["csrf_token"]) > 0

    def test_csrf_token_persists(self, client):
        """Same session returns the same token."""
        with client:
            resp1 = client.get("/api/auth/csrf")
            assert resp1.status_code == 200
            token1 = resp1.get_json()["csrf_token"]

            resp2 = client.get("/api/auth/csrf")
            assert resp2.status_code == 200
            token2 = resp2.get_json()["csrf_token"]

            assert token1 == token2


# ---------------------------------------------------------------------------
# GET /api/auth/verify-email
# ---------------------------------------------------------------------------


class TestVerifyEmail:
    """Tests for GET /api/auth/verify-email."""

    def test_verify_email_success(self, client, app):
        """200 — verify a valid token, user.verified becomes True, token.used becomes True."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            # Register user (creates a verification token automatically)
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Verify Test",
                    "username": "verifyme",
                    "email": "verifyme@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_data = resp.get_json()["user"]

        # Create a fresh verification token directly in DB
        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_data["id"])
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.EMAIL_VERIFY,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
            db.session.add(token)
            db.session.commit()

        # Verify the email
        with client:
            resp = client.post(
                "/api/auth/verify-email",
                data=json.dumps({"token": token_str}),
                content_type="application/json",
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "Email verified successfully" in body["message"]

        # Assert DB state updated
        with app.app_context():
            from models import User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_data["id"])
            assert user.verified is True

            token = VerificationToken.query.filter_by(token=token_str).first()
            assert token.used is True

    def test_verify_email_expired_token(self, client, app):
        """400 — using an expired token should be rejected."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Expired Token",
                    "username": "expiredtok",
                    "email": "expired@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.EMAIL_VERIFY,
                expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.post(
                "/api/auth/verify-email",
                data=json.dumps({"token": token_str}),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Invalid or expired" in body["error"]

    def test_verify_email_used_token(self, client, app):
        """400 — a token already marked as used should be rejected."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Used Token",
                    "username": "usedtok",
                    "email": "usedtok@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.EMAIL_VERIFY,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
                used=True,
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.post(
                "/api/auth/verify-email",
                data=json.dumps({"token": token_str}),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Invalid or expired" in body["error"]

    def test_verify_email_invalid_token(self, client):
        """400 — a made-up token that does not exist should be rejected."""
        with client:
            resp = client.post(
                "/api/auth/verify-email",
                data=json.dumps({"token": "nonexistent-token-12345"}),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Invalid or expired" in body["error"]

    def test_verify_email_missing_token(self, client):
        """400 — request without the token field in the JSON body should be rejected."""
        with client:
            resp = client.post(
                "/api/auth/verify-email",
                data=json.dumps({}),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "token" in body["error"].lower()


# ---------------------------------------------------------------------------
# POST /api/auth/resend-verification
# ---------------------------------------------------------------------------


class TestResendVerification:
    """Tests for POST /api/auth/resend-verification."""

    def test_resend_verification_success(self, client, app):
        """200 — authenticated user with valid CSRF gets a new verification token."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Resend Test",
                    "username": "resendme",
                    "email": "resendme@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            csrf_token = resp.get_json()["csrf_token"]
            user_id = resp.get_json()["user"]["id"]

            resp = client.post(
                "/api/auth/resend-verification",
                headers={"X-CSRF-Token": csrf_token},
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "Verification email sent" in body["message"]

        # A new EMAIL_VERIFY token should exist (old one was cleaned by _create_token)
        with app.app_context():
            from models import VerificationToken, TokenType

            tokens = VerificationToken.query.filter_by(
                user_id=user_id,
                token_type=TokenType.EMAIL_VERIFY,
            ).all()
            assert len(tokens) == 1

    def test_resend_verification_already_verified(self, client, app):
        """400 — a verified user should not be able to resend verification."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Already Verified",
                    "username": "alreadyverified",
                    "email": "alreadyverified@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            csrf_token = resp.get_json()["csrf_token"]
            user_id = resp.get_json()["user"]["id"]

        # Mark user as verified in DB
        with app.app_context():
            from models import User
            from extensions import db

            user = db.session.get(User, user_id)
            user.verified = True
            db.session.commit()

        # Attempt resend
        with client:
            resp = client.post(
                "/api/auth/resend-verification",
                headers={"X-CSRF-Token": csrf_token},
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "already verified" in body["error"].lower()

    def test_resend_verification_no_auth(self, client):
        """401 — unauthenticated requests should be rejected."""
        with client:
            resp = client.post("/api/auth/resend-verification")
            assert resp.status_code == 401

    def test_resend_verification_no_csrf(self, client, auth_headers):
        """403 — authenticated but missing CSRF header should be rejected."""
        headers, _ = auth_headers
        with client:
            resp = client.post("/api/auth/resend-verification")
            assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /api/auth/forgot-password
# ---------------------------------------------------------------------------


class TestForgotPassword:
    """Tests for POST /api/auth/forgot-password."""

    def test_forgot_password_existing_email(self, client, app):
        """200 — existing email returns generic message and creates a PASSWORD_RESET token."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Forgot Test",
                    "username": "forgotme",
                    "email": "forgotme@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        # Request password reset
        with client:
            resp = client.post(
                "/api/auth/forgot-password",
                data=json.dumps({"email": "forgotme@example.com"}),
                content_type="application/json",
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "If an account with that email exists" in body["message"]

        # A PASSWORD_RESET token should have been created
        with app.app_context():
            from models import VerificationToken, TokenType

            token = VerificationToken.query.filter_by(
                user_id=user_id,
                token_type=TokenType.PASSWORD_RESET,
            ).first()
            assert token is not None

    def test_forgot_password_nonexistent_email(self, client, app):
        """200 — non-existent email returns same generic message, no token created."""
        with client:
            resp = client.post(
                "/api/auth/forgot-password",
                data=json.dumps({"email": "noone@example.com"}),
                content_type="application/json",
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "If an account with that email exists" in body["message"]

        with app.app_context():
            from models import VerificationToken, TokenType

            count = VerificationToken.query.filter_by(
                token_type=TokenType.PASSWORD_RESET,
            ).count()
            assert count == 0

    def test_forgot_password_missing_email(self, client):
        """400 — empty body should be rejected."""
        with client:
            resp = client.post(
                "/api/auth/forgot-password",
                data=json.dumps({}),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "email" in body["error"].lower()

    def test_forgot_password_old_tokens_cleaned(self, client, app):
        """Old PASSWORD_RESET tokens are deleted when a new one is requested."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Clean Test",
                    "username": "cleantok",
                    "email": "cleantok@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        # Create 2 old PASSWORD_RESET tokens
        with app.app_context():
            from models import VerificationToken, TokenType
            from extensions import db

            for _ in range(2):
                token = VerificationToken(
                    user_id=user_id,
                    token=uuid_lib.uuid4().hex,
                    token_type=TokenType.PASSWORD_RESET,
                    expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                )
                db.session.add(token)
            db.session.commit()

            count_before = VerificationToken.query.filter_by(
                user_id=user_id,
                token_type=TokenType.PASSWORD_RESET,
            ).count()
            assert count_before == 2

        # Trigger a new forgot-password request
        with client:
            resp = client.post(
                "/api/auth/forgot-password",
                data=json.dumps({"email": "cleantok@example.com"}),
                content_type="application/json",
            )
            assert resp.status_code == 200

        # Only 1 token should remain (old ones deleted)
        with app.app_context():
            from models import VerificationToken, TokenType

            tokens = VerificationToken.query.filter_by(
                user_id=user_id,
                token_type=TokenType.PASSWORD_RESET,
            ).all()
            assert len(tokens) == 1


# ---------------------------------------------------------------------------
# GET /api/auth/validate-reset-token
# ---------------------------------------------------------------------------


class TestValidateResetToken:
    """Tests for GET /api/auth/validate-reset-token."""

    def test_validate_reset_token_valid(self, client, app):
        """200 — valid token returns body.valid == True."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Validate Test",
                    "username": "validateme",
                    "email": "validateme@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.get(f"/api/auth/validate-reset-token?token={token_str}")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["valid"] is True

    def test_validate_reset_token_expired(self, client, app):
        """200 — expired token returns body.valid == False."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Val Expired",
                    "username": "valexpired",
                    "email": "valexpired@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.get(f"/api/auth/validate-reset-token?token={token_str}")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["valid"] is False
            assert "error" in body

    def test_validate_reset_token_used(self, client, app):
        """200 — used token returns body.valid == False."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Val Used",
                    "username": "valused",
                    "email": "valused@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                used=True,
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.get(f"/api/auth/validate-reset-token?token={token_str}")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["valid"] is False

    def test_validate_reset_token_invalid(self, client):
        """200 — non-existent token returns body.valid == False."""
        with client:
            resp = client.get(
                "/api/auth/validate-reset-token?token=nonexistent-token-abc"
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["valid"] is False

    def test_validate_reset_token_missing(self, client):
        """400 — request without ?token= should be rejected."""
        with client:
            resp = client.get("/api/auth/validate-reset-token")
            assert resp.status_code == 400
            body = resp.get_json()
            assert "token" in body["error"].lower()


# ---------------------------------------------------------------------------
# POST /api/auth/reset-password
# ---------------------------------------------------------------------------


class TestResetPassword:
    """Tests for POST /api/auth/reset-password."""

    def test_reset_password_success(self, client, app):
        """200 — reset with valid token updates password and marks token used."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Reset Test",
                    "username": "resetme",
                    "email": "resetme@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.post(
                "/api/auth/reset-password",
                data=json.dumps({
                    "token": token_str,
                    "password": "newpass123",
                    "confirm_password": "newpass123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200
            body = resp.get_json()
            assert "Password reset successfully" in body["message"]

        # Verify DB state
        with app.app_context():
            from models import User, VerificationToken
            from extensions import db

            token = VerificationToken.query.filter_by(token=token_str).first()
            assert token.used is True

            user = db.session.get(User, user_id)
            assert user.password_changed_at is not None
            assert user.check_password("newpass123") is True

        # Should be able to login with new password
        with client:
            resp = client.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "resetme",
                    "password": "newpass123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200

    def test_reset_password_expired_token(self, client, app):
        """400 — expired token should be rejected."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Reset Expired",
                    "username": "resetexp",
                    "email": "resetexp@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.post(
                "/api/auth/reset-password",
                data=json.dumps({
                    "token": token_str,
                    "password": "newpass123",
                    "confirm_password": "newpass123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Invalid or expired" in body["error"]

    def test_reset_password_used_token(self, client, app):
        """400 — already-used token should be rejected."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Reset Used",
                    "username": "resetusdtok",
                    "email": "resetusdtok@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                used=True,
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.post(
                "/api/auth/reset-password",
                data=json.dumps({
                    "token": token_str,
                    "password": "newpass123",
                    "confirm_password": "newpass123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Invalid or expired" in body["error"]

    def test_reset_password_mismatched(self, client, app):
        """400 — mismatched password and confirm_password should be rejected."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Reset Mismatch",
                    "username": "resetmis",
                    "email": "resetmis@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.post(
                "/api/auth/reset-password",
                data=json.dumps({
                    "token": token_str,
                    "password": "newpass123",
                    "confirm_password": "different456",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "Passwords do not match" in body["error"]

    def test_reset_password_short(self, client, app):
        """400 — password shorter than 8 characters should be rejected."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Reset Short",
                    "username": "resetshort",
                    "email": "resetshort@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        with client:
            resp = client.post(
                "/api/auth/reset-password",
                data=json.dumps({
                    "token": token_str,
                    "password": "short",
                    "confirm_password": "short",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "at least 8" in body["error"].lower()

    def test_reset_password_missing_fields(self, client):
        """400 — empty body should be rejected."""
        with client:
            resp = client.post(
                "/api/auth/reset-password",
                data=json.dumps({}),
                content_type="application/json",
            )
            assert resp.status_code == 400
            body = resp.get_json()
            assert "required" in body["error"].lower()

    def test_reset_password_invalidates_sessions(self, client, app):
        """Resetting password should invalidate sessions created before the reset."""
        import uuid as uuid_lib
        from datetime import datetime, timedelta, timezone

        # Register user on client1
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Session Inv",
                    "username": "sessioninv",
                    "email": "sessioninv@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        # Create a password_reset token
        token_str = uuid_lib.uuid4().hex
        with app.app_context():
            from models import TokenType, User, VerificationToken
            from extensions import db

            user = db.session.get(User, user_id)
            token = VerificationToken(
                user_id=user.id,
                token=token_str,
                token_type=TokenType.PASSWORD_RESET,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
            db.session.add(token)
            db.session.commit()

        # Create a second session by logging in on client2
        client2 = app.test_client()
        with client2:
            resp = client2.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "sessioninv",
                    "password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200

        # Reset password on client1 (using the token)
        with client:
            resp = client.post(
                "/api/auth/reset-password",
                data=json.dumps({
                    "token": token_str,
                    "password": "newpassword123",
                    "confirm_password": "newpassword123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200

        # client2's session should now be invalidated
        with client2:
            resp = client2.get("/api/auth/me")
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Session invalidation tests
# ---------------------------------------------------------------------------


class TestSessionInvalidation:
    """Tests for session invalidation after password changes."""

    def test_profile_password_change_keeps_session(self, client, auth_headers):
        """After changing password via PUT /api/auth/password, the current session is still valid."""
        headers, _ = auth_headers
        with client:
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "password123",
                    "new_password": "newpassword123",
                    "confirm_password": "newpassword123",
                }),
                headers=headers,
            )
            assert resp.status_code == 200

            # Session should still be alive — login_time was updated
            resp = client.get("/api/auth/me")
            assert resp.status_code == 200
            body = resp.get_json()
            assert body["user"]["username"] == "testuser"

    def test_session_invalidated_after_password_change(self, client, app):
        """Other sessions created before a password change should be invalidated."""
        # Register user on client (session A)
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Session Two",
                    "username": "sessiontwo",
                    "email": "sessiontwo@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            csrf_client_a = resp.get_json()["csrf_token"]

        # Login as same user on client2 (session B)
        client2 = app.test_client()
        with client2:
            resp = client2.post(
                "/api/auth/login",
                data=json.dumps({
                    "identifier": "sessiontwo",
                    "password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 200

        # On session A, change password
        with client:
            resp = client.put(
                "/api/auth/password",
                data=json.dumps({
                    "current_password": "password123",
                    "new_password": "newpassword456",
                    "confirm_password": "newpassword456",
                }),
                headers={
                    "X-CSRF-Token": csrf_client_a,
                    "Content-Type": "application/json",
                },
            )
            assert resp.status_code == 200

        # Session B should be invalidated (login_time < password_changed_at)
        with client2:
            resp = client2.get("/api/auth/me")
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Registration verified flag tests
# ---------------------------------------------------------------------------


class TestRegistrationVerifiedFlag:
    """Tests for the verified flag and verification token on registration."""

    def test_register_user_verified_is_false(self, client):
        """After registration, the returned user object has verified=False."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Reg Verified",
                    "username": "regverified",
                    "email": "regverified@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            body = resp.get_json()
            assert body["user"]["verified"] is False

    def test_register_creates_verification_token(self, client, app):
        """After registration, an EMAIL_VERIFY token exists in the DB for that user."""
        with client:
            resp = client.post(
                "/api/auth/register",
                data=json.dumps({
                    "name": "Reg Token",
                    "username": "regtoken",
                    "email": "regtoken@example.com",
                    "password": "password123",
                    "confirm_password": "password123",
                }),
                content_type="application/json",
            )
            assert resp.status_code == 201
            user_id = resp.get_json()["user"]["id"]

        with app.app_context():
            from models import VerificationToken, TokenType

            tokens = VerificationToken.query.filter_by(
                user_id=user_id,
                token_type=TokenType.EMAIL_VERIFY,
            ).all()
            assert len(tokens) == 1
