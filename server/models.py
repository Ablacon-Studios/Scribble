"""SQLAlchemy ORM models for the Scribble application."""

import enum
import json as _json
import logging
from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db

logger = logging.getLogger(__name__)


class User(db.Model):
    """A registered user account.

    Usernames and emails are stored lower-cased so that uniqueness checks
    are case-insensitive.
    """

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    verified = db.Column(db.Boolean, default=False, nullable=False)
    password_changed_at = db.Column(db.DateTime, nullable=True, default=None)

    # ------------------------------------------------------------------
    # Password helpers
    # ------------------------------------------------------------------

    def set_password(self, password: str) -> None:
        """Hash and store the given plain-text password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Return ``True`` if *password* matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Return a JSON-safe dictionary representing this user.

        ``password_hash`` is deliberately excluded.
        """
        return {
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "email": self.email,
            "verified": self.verified,
            "created_at": self.created_at.isoformat(),
        }


class TokenType(enum.Enum):
    EMAIL_VERIFY = "email_verify"
    PASSWORD_RESET = "password_reset"


class VerificationToken(db.Model):
    __tablename__ = "verification_tokens"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = db.Column(db.String(36), unique=True, nullable=False, index=True)
    token_type = db.Column(db.Enum(TokenType), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    user = db.relationship("User", backref=db.backref("verification_tokens", cascade="all, delete-orphan"))

    @property
    def is_expired(self) -> bool:
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return now > expires


class Project(db.Model):
    """A saved drawing project belonging to a user."""

    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    strokes_json = db.Column(db.Text, nullable=False)
    canvas_width = db.Column(db.Integer, nullable=True)
    canvas_height = db.Column(db.Integer, nullable=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = db.relationship(
        "User", backref=db.backref("projects", cascade="all, delete-orphan"),
    )

    def _stroke_count(self) -> int:
        """Return the number of strokes stored in the JSON array."""
        try:
            payload = _json.loads(self.strokes_json)
            strokes = payload.get("strokes", []) if isinstance(payload, dict) else []
            return len(strokes) if isinstance(strokes, list) else 0
        except (_json.JSONDecodeError, TypeError):
            logger.warning("Corrupted strokes_json for project %d", self.id)
            return 0

    def to_dict(self, include_strokes: bool = False) -> dict:
        """Return a JSON-safe dictionary representing this project.

        ``strokes`` are included only when *include_strokes* is True.
        """
        result: dict = {
            "id": self.id,
            "name": self.name,
            "stroke_count": self._stroke_count(),
            "canvas_width": self.canvas_width,
            "canvas_height": self.canvas_height,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_strokes:
            try:
                result["strokes"] = _json.loads(self.strokes_json)
            except (_json.JSONDecodeError, TypeError):
                logger.warning("Corrupted strokes_json for project %d", self.id)
                result["strokes"] = []
        return result

    @staticmethod
    def serialize_strokes(
        strokes: list,
        canvas_w: int | None = None,
        canvas_h: int | None = None,
    ) -> str:
        """Wrap *strokes* in a version envelope and return a JSON string."""
        payload: dict = {"version": 1, "strokes": strokes}
        if canvas_w is not None:
            payload["canvas_width"] = canvas_w
        if canvas_h is not None:
            payload["canvas_height"] = canvas_h
        return _json.dumps(payload, separators=(",", ":"))
