"""Authentication blueprint – registration, login, profile management."""

import logging
import os
import re
import uuid as uuid_lib
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Blueprint, jsonify, request, session
from sqlalchemy.exc import IntegrityError

from email_utils import send_password_reset_email, send_verification_email
from extensions import db, limiter
from models import TokenType, User, VerificationToken

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers & decorators
# ---------------------------------------------------------------------------

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]+$")


def _error(message: str, status: int):
    """Return a standard JSON error response."""
    return jsonify({"error": message}), status


def _get_current_user() -> User | None:
    """Load the currently-authenticated user from the session, or None."""
    user_id = session.get("user_id")
    if user_id is None:
        return None
    user = db.session.get(User, user_id)
    if user is None:
        return None

    if user.password_changed_at is not None:
        login_time_str = session.get("login_time")
        if login_time_str is None:
            return None
        login_time = datetime.fromisoformat(login_time_str)
        pwd_changed = user.password_changed_at
        if pwd_changed.tzinfo is None:
            pwd_changed = pwd_changed.replace(tzinfo=timezone.utc)
        if login_time < pwd_changed:
            session.clear()
            return None

    return user


def _require_auth(f):
    """Decorator: require a valid session.  Returns 401 otherwise."""

    @wraps(f)
    def decorated(*args, **kwargs):
        if _get_current_user() is None:
            return _error("Authentication required", 401)
        return f(*args, **kwargs)

    return decorated


def _require_csrf(f):
    """Decorator: validate the CSRF token for state-changing requests."""

    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get("csrf_token") is None:
            return _error("Invalid CSRF token", 403)
        token = request.headers.get("X-CSRF-Token", "")
        if not token or token != session["csrf_token"]:
            return _error("Invalid CSRF token", 403)
        return f(*args, **kwargs)

    return decorated


def _set_csrf_token() -> str:
    """Generate a fresh CSRF token, store it in the session, and return it."""
    token = uuid_lib.uuid4().hex
    session["csrf_token"] = token
    return token


def _login_user(user: User) -> dict:
    """Persist the user id in session, rotate CSRF, return user + token."""
    session.clear()  # Rotate session ID to prevent session fixation
    session["user_id"] = user.id
    session["login_time"] = datetime.now(timezone.utc).isoformat()
    csrf_token = _set_csrf_token()
    return {"user": user.to_dict(), "csrf_token": csrf_token}


def _create_token(user: User, token_type: TokenType, expires_in_hours: int) -> VerificationToken:
    """Create a one-time-use token, cleaning up old tokens of same type first."""
    VerificationToken.query.filter_by(
        user_id=user.id,
        token_type=token_type,
    ).delete()
    db.session.flush()

    token = VerificationToken(
        user_id=user.id,
        token=uuid_lib.uuid4().hex,
        token_type=token_type,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
    )
    db.session.add(token)
    db.session.commit()
    return token


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_username(username: str) -> str | None:
    """Return an error message if *username* is invalid, else None."""
    username = username.strip().lower()
    if not (3 <= len(username) <= 50):
        return "Username must be 3–50 characters and contain only letters, numbers, and underscores"
    if not _USERNAME_RE.match(username):
        return "Username must be 3–50 characters and contain only letters, numbers, and underscores"
    return None


def _validate_email(email: str) -> str | None:
    """Return an error message if *email* is invalid, else None."""
    email = email.strip().lower()
    if "@" not in email or len(email) < 5:
        return "Invalid email format"
    return None


def _validate_password(password: str) -> str | None:
    """Return an error message if *password* is too short, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@auth_bp.route("/csrf", methods=["GET"])
@limiter.limit("30 per minute")
def get_csrf_token():
    """Return a CSRF token for the current session (create if needed)."""
    token = session.get("csrf_token") or _set_csrf_token()
    return jsonify({"csrf_token": token}), 200


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("3 per hour")
def register():
    """Create a new user account and log them in."""
    data = request.get_json(silent=True) or {}

    # -- Required fields ---------------------------------------------------
    name = data.get("name", "").strip()
    username = data.get("username", "").strip().lower()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not name:
        return _error("Field 'name' is required", 400)
    if len(name) > 100:
        return _error("Name must be at most 100 characters", 400)

    # -- Validate individual fields ----------------------------------------
    err = _validate_username(username)
    if err:
        return _error(err, 400)

    err = _validate_email(email)
    if err:
        return _error(err, 400)

    err = _validate_password(password)
    if err:
        return _error(err, 400)

    if password != confirm_password:
        return _error("Passwords do not match", 400)

    # -- Uniqueness checks (case-insensitive) ------------------------------
    if db.session.query(User.id).filter(User.username == username).first():
        return _error("Username is already taken", 409)

    if db.session.query(User.id).filter(User.email == email).first():
        return _error("Email is already registered", 409)

    # -- Create user -------------------------------------------------------
    user = User(name=name, username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # Determine which field conflicted (rare race between SELECT and INSERT)
        if db.session.query(User.id).filter(User.username == username).first():
            return _error("Username is already taken", 409)
        if db.session.query(User.id).filter(User.email == email).first():
            return _error("Email is already registered", 409)
        return _error("Conflict", 409)

    # Log the user in (sets session + returns CSRF token)
    result = _login_user(user)

    # Create email verification token and send verification email
    verification_token = _create_token(user, TokenType.EMAIL_VERIFY, expires_in_hours=24)
    app_url = os.environ.get("APP_URL", "http://localhost:5173")
    verify_link = f"{app_url}/verify-email?token={verification_token.token}"
    send_verification_email(user.email, verify_link)

    result["verification_url"] = verify_link
    return jsonify(result), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    """Authenticate a user by username / email and password."""
    data = request.get_json(silent=True) or {}

    identifier = data.get("identifier", "").strip().lower()
    password = data.get("password", "")

    if not identifier or not password:
        return _error("Username/email and password are required", 400)

    # Look up by username *or* email (case-insensitive)
    user = db.session.query(User).filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()

    if user is None or not user.check_password(password):
        return _error("Invalid username/email or password", 401)

    result = _login_user(user)
    return jsonify(result), 200


@auth_bp.route("/logout", methods=["POST"])
@_require_auth
@_require_csrf
def logout():
    """Clear the session, logging the user out."""
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
@_require_auth
def get_current_user():
    """Return the currently authenticated user."""
    return jsonify({"user": _get_current_user().to_dict()}), 200


@auth_bp.route("/password", methods=["PUT"])
@_require_auth
@_require_csrf
@limiter.limit("5 per minute")
def change_password():
    """Change the authenticated user's password (requires current password)."""
    user = _get_current_user()
    data = request.get_json(silent=True) or {}

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    # Validate
    if not current_password:
        return _error("Current password is required", 400)
    if not new_password:
        return _error("New password is required", 400)

    err = _validate_password(new_password)
    if err:
        return _error(err, 400)

    if new_password != confirm_password:
        return _error("Passwords do not match", 400)

    if not user.check_password(current_password):
        return _error("Current password is incorrect", 403)

    user.set_password(new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    db.session.commit()
    session["login_time"] = datetime.now(timezone.utc).isoformat()

    return jsonify({"message": "Password changed successfully"}), 200


@auth_bp.route("/email", methods=["PUT"])
@_require_auth
@_require_csrf
@limiter.limit("5 per minute")
def change_email():
    """Change the authenticated user's email (requires current password)."""
    user = _get_current_user()
    data = request.get_json(silent=True) or {}

    new_email = data.get("new_email", "").strip().lower()
    password = data.get("password", "")

    # Validate
    if not new_email:
        return _error("New email is required", 400)
    err = _validate_email(new_email)
    if err:
        return _error(err, 400)

    if not password:
        return _error("Current password is required", 400)

    if not user.check_password(password):
        return _error("Current password is incorrect", 403)

    # Check uniqueness
    existing = db.session.query(User.id).filter(
        User.email == new_email, User.id != user.id
    ).first()
    if existing:
        return _error("Email is already registered", 409)

    user.email = new_email
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # The concurrent request may have grabbed this email after our check
        if db.session.query(User.id).filter(User.email == new_email).first():
            return _error("Email is already registered", 409)
        return _error("Conflict", 409)

    return jsonify({"user": user.to_dict(), "message": "Email changed successfully"}), 200


@auth_bp.route("/profile", methods=["PUT"])
@_require_auth
@_require_csrf
@limiter.limit("10 per minute")
def update_profile():
    """Update the authenticated user's display name and/or username."""
    user = _get_current_user()
    data = request.get_json(silent=True) or {}

    name = data.get("name", None)
    username = data.get("username", None)

    # At least one field must be provided
    if name is None and username is None:
        return _error("At least one of 'name' or 'username' must be provided", 400)

    changes = False

    if name is not None:
        name = name.strip()
        if not name or len(name) > 100:
            return _error("Name must be between 1 and 100 characters", 400)
        user.name = name
        changes = True

    if username is not None:
        username = username.strip().lower()
        err = _validate_username(username)
        if err:
            return _error(err, 400)

        # Check uniqueness (excluding current user)
        existing = db.session.query(User.id).filter(
            User.username == username, User.id != user.id
        ).first()
        if existing:
            return _error("Username is already taken", 409)

        user.username = username
        changes = True

    if not changes:
        return _error("No valid fields to update", 400)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # The concurrent request may have grabbed this username after our check
        if username is not None and db.session.query(User.id).filter(
            User.username == username, User.id != user.id
        ).first():
            return _error("Username is already taken", 409)
        return _error("Conflict", 409)

    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/verify-email", methods=["POST"])
@limiter.limit("10 per minute")
def verify_email():
    data = request.get_json(silent=True) or {}
    token_str = (data.get("token") or "").strip()
    if not token_str:
        return _error("Verification token is required", 400)

    verification = VerificationToken.query.filter_by(
        token=token_str,
        token_type=TokenType.EMAIL_VERIFY,
        used=False,
    ).first()

    if not verification or verification.is_expired:
        return _error("Invalid or expired verification token", 400)

    user = db.session.get(User, verification.user_id)
    if user is None:
        return _error("User not found", 400)

    user.verified = True
    verification.used = True
    db.session.commit()

    return jsonify({"message": "Email verified successfully. You can now use all features."}), 200


@auth_bp.route("/resend-verification", methods=["POST"])
@_require_auth
@_require_csrf
@limiter.limit("1 per 2 minutes")
def resend_verification():
    user = _get_current_user()
    if user.verified:
        return _error("Email is already verified", 400)

    verification_token = _create_token(user, TokenType.EMAIL_VERIFY, expires_in_hours=24)
    app_url = os.environ.get("APP_URL", "http://localhost:5173")
    verify_link = f"{app_url}/verify-email?token={verification_token.token}"
    send_verification_email(user.email, verify_link)

    return jsonify({"message": "Verification email sent. Check your inbox."}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("3 per hour")
def forgot_password():
    # Defense-in-depth: require same-origin requests for state-changing public endpoints
    origin = request.headers.get("Origin", "")
    if origin and not origin.startswith(request.host_url.rstrip("/")):
        return _error("Invalid origin", 403)

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return _error("Email is required", 400)

    user = User.query.filter_by(email=email).first()
    if user is not None:
        reset_token = _create_token(user, TokenType.PASSWORD_RESET, expires_in_hours=1)
        app_url = os.environ.get("APP_URL", "http://localhost:5173")
        reset_link = f"{app_url}/reset-password?token={reset_token.token}"
        send_password_reset_email(user.email, reset_link)
    else:
        logger.info("Password reset requested for unknown email: %s (no token created)", email)

    return jsonify({"message": "If an account with that email exists, a password reset link has been sent."}), 200


@auth_bp.route("/validate-reset-token", methods=["GET"])
@limiter.limit("30 per minute")
def validate_reset_token():
    token_str = request.args.get("token", "").strip()
    if not token_str:
        return _error("Reset token is required", 400)

    reset_request = VerificationToken.query.filter_by(
        token=token_str,
        token_type=TokenType.PASSWORD_RESET,
        used=False,
    ).first()

    if not reset_request or reset_request.is_expired:
        return jsonify({"valid": False, "error": "Invalid or expired reset token"}), 200

    return jsonify({"valid": True}), 200


@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5 per minute")
def reset_password():
    # Defense-in-depth: require same-origin requests for state-changing public endpoints
    origin = request.headers.get("Origin", "")
    if origin and not origin.startswith(request.host_url.rstrip("/")):
        return _error("Invalid origin", 403)

    data = request.get_json(silent=True) or {}
    token_str = (data.get("token") or "").strip()
    new_password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not token_str or not new_password or not confirm_password:
        return _error("Token, password, and confirm password are required", 400)

    if len(new_password) < 8:
        return _error("Password must be at least 8 characters", 400)

    if new_password != confirm_password:
        return _error("Passwords do not match", 400)

    reset_request = VerificationToken.query.filter_by(
        token=token_str,
        token_type=TokenType.PASSWORD_RESET,
        used=False,
    ).first()

    if not reset_request or reset_request.is_expired:
        return _error("Invalid or expired reset token", 400)

    user = db.session.get(User, reset_request.user_id)
    if user is None:
        return _error("Invalid or expired reset token", 400)

    user.set_password(new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    reset_request.used = True
    db.session.commit()

    return jsonify({"message": "Password reset successfully. You can now log in with your new password."}), 200
