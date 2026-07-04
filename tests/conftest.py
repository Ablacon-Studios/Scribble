"""
Shared pytest fixtures and configuration for the Scribble backend tests.
"""
import sys
import os
import tempfile
import shutil
from pathlib import Path

import pytest

# Make sure the server directory is importable
SERVER_DIR = Path(__file__).parent.parent / "server"
sys.path.insert(0, str(SERVER_DIR))


@pytest.fixture
def mock_dist_dir():
    """Create a temporary client/dist directory with index.html for testing."""
    project_root = Path(__file__).parent.parent
    dist_dir = project_root / "client" / "dist"

    # Save any existing dist directory
    existed_before = dist_dir.exists()
    if existed_before:
        backup_dir = project_root / "client" / "dist_backup"
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        shutil.move(str(dist_dir), str(backup_dir))

    # Create mock dist directory with index.html
    dist_dir.mkdir(parents=True, exist_ok=True)
    index_path = dist_dir / "index.html"
    index_path.write_text("<html><body>Scribble Test App</body></html>")

    yield dist_dir

    # Cleanup: remove mock dist directory
    shutil.rmtree(str(dist_dir), ignore_errors=True)

    # Restore original dist directory if it existed
    if existed_before:
        backup_dir = project_root / "client" / "dist_backup"
        if backup_dir.exists():
            shutil.move(str(backup_dir), str(dist_dir))


@pytest.fixture
def no_dist_dir():
    """Ensure client/dist/ does NOT exist during the test. Restores afterwards."""
    project_root = Path(__file__).resolve().parent.parent
    dist_dir = project_root / "client" / "dist"
    backup_dir = project_root / "client" / "dist_backup_temp"

    if dist_dir.exists():
        shutil.move(str(dist_dir), str(backup_dir))

    yield dist_dir

    # Clean up any dist dir created during the test
    if dist_dir.exists():
        shutil.rmtree(str(dist_dir), ignore_errors=True)

    # Restore original dist directory if it existed
    if backup_dir.exists():
        shutil.move(str(backup_dir), str(dist_dir))


@pytest.fixture(autouse=True)
def clear_flask_env():
    """Ensure FLASK_ENV is reset between tests.

    This fixture runs automatically before each test to prevent
    environment leakage between tests.
    """
    # Store original values
    original_flask_env = os.environ.get("FLASK_ENV")
    original_cors_origins = os.environ.get("CORS_ORIGINS")

    yield

    # Restore or clear
    if original_flask_env is not None:
        os.environ["FLASK_ENV"] = original_flask_env
    else:
        os.environ.pop("FLASK_ENV", None)

    if original_cors_origins is not None:
        os.environ["CORS_ORIGINS"] = original_cors_origins
    else:
        os.environ.pop("CORS_ORIGINS", None)
