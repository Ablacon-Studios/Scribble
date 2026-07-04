"""
Tests for the Flask app factory and serving behavior.
"""
import os
from pathlib import Path

import pytest

from app import create_app


# ---------------------------------------------------------------------------
# Test: Development mode app creation
# ---------------------------------------------------------------------------
def test_create_app_development_mode(monkeypatch):
    """In development mode, the app should NOT serve client/dist and CORS should be enabled."""
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    app, socketio = create_app()

    # Development mode: should NOT have client/dist as the static folder
    static_folder = str(app.static_folder) if app.static_folder else ""
    assert "client" not in static_folder.lower(), (
        "Development mode should not serve the React build from client/dist"
    )
    # Dev mode should have the default static_url_path (not empty string like prod)
    assert app.static_url_path == "/static", (
        "Development mode should use default /static URL path, not root"
    )

    # Development mode: CORS should be configured — verify via a preflight request
    with app.test_client() as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Flask-CORS should return Access-Control-Allow-Origin header
        assert "Access-Control-Allow-Origin" in response.headers, (
            "CORS headers should be present in development mode"
        )

    # SocketIO should be initialized and not None
    assert socketio is not None
    assert socketio.server is not None


# ---------------------------------------------------------------------------
# Test: Production mode app creation
# ---------------------------------------------------------------------------
def test_create_app_production_mode(monkeypatch, mock_dist_dir):
    """In production mode, the app should be created and serve static files."""
    monkeypatch.setenv("FLASK_ENV", "production")

    app, _ = create_app()

    # Production mode: the SPA catch-all route should serve index.html
    assert app.static_folder is not None, (
        "Production mode should have a static folder configured"
    )

    # Verify the SPA route serves index.html correctly
    with app.test_client() as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.content_type.startswith("text/html"), (
            "Root path should serve HTML"
        )

    # Verify assets are served with correct MIME types
    with app.test_client() as client:
        # Find a .js file in the dist directory to test with
        import os
        dist = os.path.join(os.path.dirname(__file__), "..", "client", "dist", "assets")
        js_files = [f for f in os.listdir(dist) if f.endswith(".js")] if os.path.isdir(dist) else []
        if js_files:
            response = client.get(f"/assets/{js_files[0]}")
            assert response.status_code == 200
            assert response.content_type.startswith("text/javascript"), (
                "JS files should be served as text/javascript, not application/json"
            )


# ---------------------------------------------------------------------------
# Test: Development status page
# ---------------------------------------------------------------------------
def test_dev_status_page(monkeypatch):
    """GET / in dev mode returns an HTML status page."""
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("FLASK_PORT", "5000")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/")

    assert response.status_code == 200
    assert response.content_type.startswith("text/html"), (
        "Dev status page should return HTML"
    )

    html = response.get_data(as_text=True)

    # The page should contain "Scribble" and indicate the server is running
    assert "Scribble" in html, "Dev status page should contain 'Scribble'"
    assert "Running" in html, "Dev status page should show 'Running' status"
    assert "API Server" in html, "Dev status page should show 'API Server' subtitle"


# ---------------------------------------------------------------------------
# Test: Production serves index.html
# ---------------------------------------------------------------------------
def test_prod_serves_index_html(monkeypatch, mock_dist_dir):
    """In production with dist/index.html present, GET / returns the built file."""
    monkeypatch.setenv("FLASK_ENV", "production")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/")

    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "Scribble Test App" in html, (
        "Production GET / should return the built index.html content"
    )


# ---------------------------------------------------------------------------
# Test: API health endpoint
# ---------------------------------------------------------------------------
def test_api_health_endpoint(monkeypatch):
    """GET /api/health returns JSON with status and mode."""
    monkeypatch.setenv("FLASK_ENV", "development")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.content_type.startswith("application/json"), (
        "Health endpoint should return JSON"
    )

    data = response.get_json()
    assert data["status"] == "ok"
    assert data["mode"] == "development"


def test_api_health_endpoint_production(monkeypatch, mock_dist_dir):
    """GET /api/health in production returns correct mode."""
    monkeypatch.setenv("FLASK_ENV", "production")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["mode"] == "production"


# ---------------------------------------------------------------------------
# Test: SPA fallback
# ---------------------------------------------------------------------------
def test_spa_fallback(monkeypatch, mock_dist_dir):
    """In production, GET /nonexistent returns index.html (SPA fallback)."""
    monkeypatch.setenv("FLASK_ENV", "production")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/nonexistent-route")

    assert response.status_code == 200, (
        "SPA fallback should return 200, not 404"
    )
    html = response.get_data(as_text=True)
    assert "Scribble Test App" in html, (
        "SPA fallback should serve index.html for unknown routes"
    )


def test_spa_fallback_nested_path(monkeypatch, mock_dist_dir):
    """In production, deep paths like /draw/abc123 return index.html."""
    monkeypatch.setenv("FLASK_ENV", "production")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/draw/abc123")

    assert response.status_code == 200, (
        "Deep paths should fallback to index.html, not 404"
    )
    html = response.get_data(as_text=True)
    assert "Scribble Test App" in html


# ---------------------------------------------------------------------------
# Test: SocketIO route not caught by SPA fallback
# ---------------------------------------------------------------------------
def test_socketio_route_not_caught_by_spa_fallback(monkeypatch, mock_dist_dir):
    """In production, /socket.io/ paths should NOT be intercepted by the
    SPA fallback route. Flask-SocketIO handles these via its middleware."""
    monkeypatch.setenv("FLASK_ENV", "production")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/socket.io/?EIO=4&transport=polling")

    # The response should NOT be the SPA index.html content.
    # If SocketIO is handling the route, the response will be an engine.io
    # handshake (or error) — but crucially not the React app shell.
    html = response.get_data(as_text=True)
    assert "Scribble Test App" not in html, (
        "SocketIO paths should not be intercepted by the SPA fallback — "
        "they must be handled by Flask-SocketIO middleware"
    )


# ---------------------------------------------------------------------------
# Test: Build missing — 503 error
# ---------------------------------------------------------------------------
def test_build_missing_503(monkeypatch, no_dist_dir):
    """In production without dist/index.html, GET / returns 503."""
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/")

    assert response.status_code == 503, (
        "Missing build should return HTTP 503"
    )
    assert response.content_type.startswith("text/html"), (
        "Build missing page should return HTML"
    )

    html = response.get_data(as_text=True)
    assert "Build Not Found" in html, (
        "503 page should indicate build is missing"
    )


def test_build_missing_nested_route(monkeypatch, no_dist_dir):
    """In production without dist, all routes return 503."""
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    app, _ = create_app()

    with app.test_client() as client:
        response = client.get("/some/random/path")

    assert response.status_code == 503, (
        "All routes should return 503 when build is missing"
    )


# ---------------------------------------------------------------------------
# Test: CORS headers in development
# ---------------------------------------------------------------------------
def test_cors_headers_dev(monkeypatch):
    """In dev mode, OPTIONS preflight returns proper CORS headers."""
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    app, _ = create_app()

    with app.test_client() as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )

    assert response.status_code == 200, (
        "Preflight OPTIONS request should succeed"
    )

    # Check that CORS headers are present
    allow_origin = response.headers.get("Access-Control-Allow-Origin")
    assert allow_origin is not None, (
        "Access-Control-Allow-Origin header must be present"
    )
    # The origin should match or be "*"
    assert allow_origin in ("http://localhost:5173", "*"), (
        f"Expected CORS origin to be http://localhost:5173 or *, got {allow_origin}"
    )
