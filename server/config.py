"""Application configuration loaded from environment variables."""

import os


class Config:
    """Base configuration with sensible defaults for development."""

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(os.path.dirname(__file__), "instance", "scribble.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    SESSION_COOKIE_SECURE: bool = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
