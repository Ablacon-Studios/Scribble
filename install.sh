#!/usr/bin/env bash
#
# Scribble — Dependency Installer (Linux / macOS)
#
# Usage:
#   chmod +x install.sh
#   ./install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color helpers (disable if stdout is not a terminal)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m' # No Color
else
    RED='' GREEN='' YELLOW='' CYAN='' NC=''
fi

print_header() {
    echo ""
    echo "============================================"
    echo "  Scribble — Dependency Installer (Linux / macOS)"
    echo "============================================"
    echo ""
}

ok()   { printf "  ${GREEN}[OK]${NC} %s\n" "$*"; }
fail() { printf "  ${RED}[FAIL]${NC} %s\n" "$*"; }
info() { printf "  ${CYAN}[INFO]${NC} %s\n" "$*"; }
step() { printf "${CYAN}[%s/%s]${NC} %s\n" "$1" "$TOTAL" "$2"; }

TOTAL=4
print_header

# ------------------------------------------------------------------
# Step 1: Check Python 3.11+
# ------------------------------------------------------------------
step 1 "Checking Python installation..."

PYTHON_CMD=""
PYTHON_VER=""

# Try python3 first, then python
for cmd in python3 python; do
    if command -v "$cmd" >/dev/null 2>&1; then
        ver=$("$cmd" --version 2>&1)
        if [[ "$ver" =~ Python\ ([0-9]+)\.([0-9]+) ]]; then
            major="${BASH_REMATCH[1]}"
            minor="${BASH_REMATCH[2]}"
            # Must be Python 3.11+
            if (( major > 3 || (major == 3 && minor >= 11) )); then
                PYTHON_CMD="$cmd"
                PYTHON_VER="${major}.${minor}"
                break
            fi
        fi
    fi
done

if [[ -z "$PYTHON_CMD" ]]; then
    fail "Python 3.11+ is not installed or not on your PATH."
    info "Install Python 3.11+ via your package manager:"
    info "  Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    info "  Fedora:        sudo dnf install python3 python3-pip"
    info "  macOS:         brew install python@3.12"
    info "Or download from: https://www.python.org/downloads/"
    exit 1
fi

ok "Found $PYTHON_CMD $PYTHON_VER"

# Ensure pip is available via the detected Python
if ! "$PYTHON_CMD" -m pip --version >/dev/null 2>&1; then
    fail "pip is not available for $PYTHON_CMD."
    info "Install pip via your package manager:"
    info "  Ubuntu/Debian: sudo apt install python3-pip"
    info "  Fedora:        sudo dnf install python3-pip"
    info "Or use: $PYTHON_CMD -m ensurepip --upgrade"
    exit 1
fi

ok "pip is available (via $PYTHON_CMD -m pip)"
echo ""

# ------------------------------------------------------------------
# Step 2: Check Node.js
# ------------------------------------------------------------------
step 2 "Checking Node.js installation..."

if ! command -v node >/dev/null 2>&1; then
    fail "Node.js is not installed or not on your PATH."
    info "Install Node.js (LTS) via:"
    info "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    info "                  sudo apt install -y nodejs"
    info "  Fedora:        sudo dnf install nodejs"
    info "  macOS:         brew install node"
    info "Or download from: https://nodejs.org/"
    exit 1
fi

NODE_VER="$(node --version)"
ok "Found Node.js $NODE_VER"

if ! command -v npm >/dev/null 2>&1; then
    fail "npm is not available. npm is bundled with Node.js — please reinstall."
    exit 1
fi

ok "Found npm $(npm --version)"
echo ""

# ------------------------------------------------------------------
# Step 3: Install Python dependencies
# ------------------------------------------------------------------
step 3 "Installing Python dependencies..."

SERVER_DIR="$SCRIPT_DIR/server"

if [[ ! -d "$SERVER_DIR" ]]; then
    fail "server/ directory not found at $SERVER_DIR"
    exit 1
fi

if [[ ! -f "$SERVER_DIR/requirements.txt" ]]; then
    fail "requirements.txt not found in $SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR"
if "$PYTHON_CMD" -m pip install -r requirements.txt; then
    ok "Python dependencies installed successfully."
else
    fail "Python dependency installation failed. Check output above for details."
    exit 1
fi

echo ""

# ------------------------------------------------------------------
# Step 4: Install Node.js dependencies
# ------------------------------------------------------------------
step 4 "Installing Node.js dependencies..."

CLIENT_DIR="$SCRIPT_DIR/client"

if [[ ! -d "$CLIENT_DIR" ]]; then
    fail "client/ directory not found at $CLIENT_DIR"
    exit 1
fi

if [[ ! -f "$CLIENT_DIR/package.json" ]]; then
    fail "package.json not found in $CLIENT_DIR"
    exit 1
fi

cd "$CLIENT_DIR"
if npm install; then
    ok "Node.js dependencies installed successfully."
else
    fail "Node.js dependency installation failed. Check output above for details."
    exit 1
fi

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------
cd "$SCRIPT_DIR"
echo ""
echo "============================================"
echo "  All dependencies installed successfully!"
echo "============================================"
echo ""
echo "  Next steps:"
echo "    - Start the backend:  cd server && python3 app.py"
echo "    - Start the frontend: cd client && npm run dev"
echo ""
