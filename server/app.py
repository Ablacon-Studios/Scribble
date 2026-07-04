import eventlet
eventlet.monkey_patch()

import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO  # noqa: F401 – kept for type annotation
from dotenv import load_dotenv

from config import Config
from extensions import db, socketio, limiter
from auth import auth_bp
from models import VerificationToken

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()


def create_app() -> tuple[Flask, SocketIO]:
    env = os.getenv("FLASK_ENV", "production")
    is_production = env == "production"

    if is_production:
        static_folder = Path(__file__).parent.parent / "client" / "dist"
        app = Flask(__name__)

        # Verify build exists
        if not (static_folder / "index.html").exists():
            logger.error("Build not found at %s", static_folder)
            logger.error(
                "Run 'cd client && npm run build' first, then restart the server."
            )
            # Still start the app but it will serve error pages
    else:
        app = Flask(__name__)
        # CORS for dev mode
        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
        origins = [o.strip() for o in cors_origins.split(",")]
        CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)

    # -- Configuration -----------------------------------------------------
    app.config.from_object(Config)

    if app.config["SECRET_KEY"] == "dev-secret-change-in-production" and env != "development":
        logger.warning("SECRET_KEY is using the default value. Set it in production!")

    # -- Extensions --------------------------------------------------------
    db.init_app(app)
    limiter.init_app(app)

    cors_allowed = (
        [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
        if not is_production
        else []
    )
    socketio.init_app(app, cors_allowed_origins=cors_allowed, async_mode="eventlet")

    # -- Database ----------------------------------------------------------
    instance_dir = os.path.join(os.path.dirname(__file__), "instance")
    os.makedirs(instance_dir, exist_ok=True)
    with app.app_context():
        db.create_all()

        # Clean up expired verification tokens older than 24 hours
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            VerificationToken.query.filter(VerificationToken.expires_at < cutoff).delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.warning("Token cleanup skipped: %s", e)

    # -- Blueprints --------------------------------------------------------
    app.register_blueprint(auth_bp)

    # --- API Routes (placeholder for future features) ---
    @app.route("/api/health")
    def api_health():
        return {"status": "ok", "mode": env}

    # --- Root route ---
    if is_production:
        build_exists = (static_folder / "index.html").exists()

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_spa(path):
            if not build_exists:
                return _build_missing_page(), 503
            # Let send_from_directory handle file resolution and path safety
            # It uses Flask's safe_join internally to prevent path traversal
            if path:
                try:
                    return send_from_directory(str(static_folder), path)
                except Exception:
                    pass  # File doesn't exist or is outside static folder
            # SPA fallback: serve index.html for all other routes
            return send_from_directory(str(static_folder), "index.html")
    else:
        @app.route("/")
        def dev_status():
            return _dev_status_page(env)

    @app.errorhandler(500)
    def handle_500(e):
        return {"error": "Internal server error"}, 500

    @app.errorhandler(404)
    def handle_404(e):
        return {"error": "Not found"}, 404

    return app, socketio


def _dev_status_page(env: str) -> str:
    """Return a styled HTML status page for development mode."""
    port = os.getenv("FLASK_PORT", "5000")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Scribble — API Server</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #1a1a2e; color: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }}
.card {{ background-color: #16213e; border: 1px solid #0f3460; border-radius: 12px; padding: 48px 56px; max-width: 440px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }}
.card h1 {{ font-size: 28px; font-weight: 700; margin-bottom: 4px; color: #fff; }}
.card .subtitle {{ font-size: 14px; color: #8892b0; margin-bottom: 28px; text-transform: uppercase; letter-spacing: 2px; }}
.status-row {{ display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #0f3460; font-size: 14px; }}
.status-row:last-of-type {{ border-bottom: none; }}
.status-label {{ color: #8892b0; }}
.status-value {{ color: #e0e0e0; font-weight: 500; }}
.status-dot {{ display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #4ade80; margin-right: 6px; box-shadow: 0 0 8px rgba(74,222,128,0.5); }}
.frontend-link {{ display: block; margin-top: 24px; padding: 12px 24px; background-color: #0f3460; color: #64b5f6; text-decoration: none; border-radius: 8px; font-size: 14px; font-family: 'Courier New', Courier, monospace; transition: background-color 0.2s; }}
.frontend-link:hover {{ background-color: #1a4a7a; }}
.footer-note {{ margin-top: 16px; font-size: 12px; color: #546e7a; }}
</style>
</head>
<body>
<div class="card">
<h1>🖌️ Scribble</h1>
<p class="subtitle">API Server</p>
<div class="status-row"><span class="status-label">Status</span><span class="status-value"><span class="status-dot"></span>Running</span></div>
<div class="status-row"><span class="status-label">Mode</span><span class="status-value">{env.title()}</span></div>
<div class="status-row"><span class="status-label">Port</span><span class="status-value">{port}</span></div>
<a class="frontend-link" href="http://localhost:5173">🌐 Open Frontend → localhost:5173</a>
<p class="footer-note">API &amp; WebSocket ready</p>
</div>
</body>
</html>"""


def _build_missing_page() -> str:
    """Return a styled HTML error page when the frontend build is missing."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Scribble — Build Missing</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #1a1a2e; color: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.card { background-color: #16213e; border: 1px solid #0f3460; border-radius: 12px; padding: 48px 56px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
.card h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #fbbf24; }
.card p { font-size: 14px; color: #8892b0; margin-bottom: 20px; line-height: 1.6; }
.card .cmd { display: block; padding: 14px 20px; background-color: #0f3460; color: #64b5f6; border-radius: 8px; font-family: 'Courier New', Courier, monospace; font-size: 14px; margin-bottom: 12px; }
.card .hint { font-size: 12px; color: #546e7a; }
</style>
</head>
<body>
<div class="card">
<h1>⚠️ Build Not Found</h1>
<p>The frontend build is missing. The React app has not been built yet.</p>
<span class="cmd">cd client</span>
<span class="cmd">npm run build</span>
<p class="hint">Then restart the server.</p>
</div>
</body>
</html>"""


# Create the app at module level
app, socketio = create_app()

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    env = os.getenv("FLASK_ENV", "production")
    logger.info("Starting Scribble server on http://%s:%s (mode: %s)", host, port, env)
    socketio.run(app, host=host, port=port, debug=debug)
