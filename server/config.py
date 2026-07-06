"""Application configuration loaded from environment variables."""

import os


def _resolve_db_url(raw: str | None) -> str:
    """Return an absolute sqlite:/// URI regardless of input format.

    Accepts both relative (``sqlite:///relative/path.db``) and absolute
    (``sqlite:////absolute/path.db``) URIs, converting the former to an
    absolute path based on this file's directory.
    """
    if raw and raw.startswith("sqlite:///"):
        # Strip the URI scheme prefix
        path = raw[len("sqlite:///"):]
        if not path.startswith("/"):
            # Relative path — resolve relative to this config file
            path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), path.lstrip("/")),
            )
        return f"sqlite:///{path}"
    return raw or ""


class Config:
    """Base configuration with sensible defaults for development."""

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    SQLALCHEMY_DATABASE_URI: str = _resolve_db_url(
        os.getenv("DATABASE_URL"),
    ) or "sqlite:///" + os.path.abspath(
        os.path.join(os.path.dirname(__file__), "instance", "scribble.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    SESSION_COOKIE_SECURE: bool = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
