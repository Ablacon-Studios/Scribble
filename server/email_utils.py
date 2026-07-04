"""Email utilities for Scribble auth system."""
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success, False on failure.

    Configure via environment variables:
      SMTP_HOST     – SMTP server hostname (default: smtp.gmail.com)
      SMTP_PORT     – SMTP server port (default: 587)
      SMTP_USER     – SMTP username / sender email
      SMTP_PASS     – SMTP password or app password
      SMTP_FROM     – From address (defaults to SMTP_USER)
      SMTP_USE_TLS  – Use STARTTLS (default: true)
    """
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"

    if not smtp_user or not smtp_pass:
        logger.warning(
            "SMTP not configured (SMTP_USER / SMTP_PASS not set). "
            "Email not sent to %s", to_email
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        if use_tls:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)

        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, [to_email], msg.as_string())
        server.quit()
        logger.info("Email sent to %s (subject: %s)", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


def send_verification_email(to_email: str, verify_link: str) -> None:
    """Send a verification email with a styled HTML body."""
    html = f"""\
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', \
Roboto, sans-serif; background-color: #1a1a2e; color: #e0e0e0; padding: 20px;">
<div style="max-width: 480px; margin: 0 auto; background-color: #16213e; \
border-radius: 12px; padding: 40px; text-align: center;">
  <h1 style="color: #fff; margin: 0 0 8px;">🖌️ Scribble</h1>
  <p style="color: #8892b0; margin: 0 0 28px;">Verify your email address</p>
  <p style="font-size: 14px; color: #e0e0e0; margin-bottom: 24px;">
    Thanks for signing up! Click the button below to verify your email and get started.
  </p>
  <a href="{verify_link}" style="display: inline-block; padding: 12px 32px; \
background-color: #7c3aed; color: #fff; text-decoration: none; \
border-radius: 8px; font-weight: 600; font-size: 14px;">Verify Email</a>
  <p style="font-size: 12px; color: #546e7a; margin-top: 24px;">
    If the button doesn't work, copy this link:<br>
    <span style="color: #64b5f6;">{verify_link}</span>
  </p>
  <p style="font-size: 12px; color: #546e7a; margin-top: 16px;">
    This link expires in 24 hours.
  </p>
</div>
</body>
</html>"""

    if not send_email(to_email, "Verify your Scribble email", html):
        logger.info(
            "=== EMAIL VERIFICATION LINK (fallback) ===\n%s\n"
            "==========================================", verify_link
        )


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """Send a password reset email with a styled HTML body."""
    html = f"""\
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', \
Roboto, sans-serif; background-color: #1a1a2e; color: #e0e0e0; padding: 20px;">
<div style="max-width: 480px; margin: 0 auto; background-color: #16213e; \
border-radius: 12px; padding: 40px; text-align: center;">
  <h1 style="color: #fff; margin: 0 0 8px;">🖌️ Scribble</h1>
  <p style="color: #8892b0; margin: 0 0 28px;">Password Reset</p>
  <p style="font-size: 14px; color: #e0e0e0; margin-bottom: 24px;">
    You requested a password reset. Click the button below to set a new password.
  </p>
  <a href="{reset_link}" style="display: inline-block; padding: 12px 32px; \
background-color: #7c3aed; color: #fff; text-decoration: none; \
border-radius: 8px; font-weight: 600; font-size: 14px;">Reset Password</a>
  <p style="font-size: 12px; color: #546e7a; margin-top: 24px;">
    If the button doesn't work, copy this link:<br>
    <span style="color: #64b5f6;">{reset_link}</span>
  </p>
  <p style="font-size: 12px; color: #546e7a; margin-top: 16px;">
    This link expires in 1 hour. If you didn't request this, ignore this email.
  </p>
</div>
</body>
</html>"""

    if not send_email(to_email, "Reset your Scribble password", html):
        logger.info(
            "=== PASSWORD RESET LINK (fallback) ===\n%s\n"
            "======================================", reset_link
        )
