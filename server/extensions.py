"""
Flask extension objects instantiated at module level.

These are imported by models, blueprints, and the app factory.  They are
initialised with ``init_app(app)`` inside ``create_app()`` so that no
application context is required at import time.
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO

db = SQLAlchemy()
socketio = SocketIO()
# NOTE: In production behind a proxy (nginx/Cloudflare), use a key_func that
# respects X-Forwarded-For to avoid all users sharing one rate-limit bucket.
limiter = Limiter(key_func=get_remote_address)
