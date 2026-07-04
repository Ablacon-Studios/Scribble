@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   Scribble — Dependency Installer (Windows)
echo ============================================
echo.

:: ------------------------------------------------------------------
:: Step 1: Check Python 3.11+
:: ------------------------------------------------------------------
echo [1/4] Checking Python installation...

set PYTHON_CMD=
set PYTHON_VER=

:: Try python first, then py launcher, then python3
for %%c in (python py python3) do (
    if "!PYTHON_CMD!"=="" (
        %%c --version >nul 2>&1
        if !errorlevel! equ 0 (
            set PYTHON_CMD=%%c
            for /f "tokens=2" %%v in ('%%c --version') do set PYTHON_VER=%%v
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo   ERROR: Python 3.11+ is not installed or not on your PATH.
    echo   Download Python 3.11+ from: https://www.python.org/downloads/
    echo   Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: Parse major.minor version
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VER%") do (
    set PY_MAJOR=%%a
    set PY_MINOR=%%b
)

:: Python 2 has major version 2 — reject it
if %PY_MAJOR% lss 3 (
    echo   ERROR: Python %PYTHON_VER% detected, but Python 3.11+ is required.
    echo   Download Python 3.11+ from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

:: For Python 3.x, minor must be >= 11
if %PY_MAJOR% equ 3 if %PY_MINOR% lss 11 (
    echo   ERROR: Python %PYTHON_VER% detected, but Python 3.11+ is required.
    echo   Download Python 3.11+ from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo   Found Python %PYTHON_VER%  [OK]

:: Find pip — prefer python -m pip to ensure packages go into the detected Python
set PIP_CMD=

%PYTHON_CMD% -m pip --version >nul 2>&1
if !errorlevel! equ 0 (
    set PIP_CMD=%PYTHON_CMD% -m pip
)

:: Fallback: try standalone pip / pip3
if "%PIP_CMD%"=="" (
    for %%c in (pip pip3) do (
        if "!PIP_CMD!"=="" (
            %%c --version >nul 2>&1
            if !errorlevel! equ 0 set PIP_CMD=%%c
        )
    )
)

if "%PIP_CMD%"=="" (
    echo   ERROR: pip is not available. Ensure pip is installed with your Python distribution.
    pause
    exit /b 1
)

echo   Using pip: %PIP_CMD%  [OK]
echo.

:: ------------------------------------------------------------------
:: Step 2: Check Node.js
:: ------------------------------------------------------------------
echo [2/4] Checking Node.js installation...

set NODE_CMD=
node --version >nul 2>&1
if !errorlevel! equ 0 set NODE_CMD=node

if "%NODE_CMD%"=="" (
    echo   ERROR: Node.js is not installed or not on your PATH.
    echo   Download Node.js (LTS recommended) from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=1" %%v in ('node --version') do set NODE_VER=%%v
echo   Found Node.js %NODE_VER%  [OK]

:: Check npm
set NPM_CMD=
npm --version >nul 2>&1
if !errorlevel! equ 0 set NPM_CMD=npm

if "%NPM_CMD%"=="" (
    echo   ERROR: npm is not available. npm is included with Node.js — please reinstall Node.js.
    pause
    exit /b 1
)

echo   Found npm  [OK]
echo.

:: ------------------------------------------------------------------
:: Step 3: Install Python dependencies
:: ------------------------------------------------------------------
echo [3/4] Installing Python dependencies...

cd /d "%~dp0server"
if %errorlevel% neq 0 (
    echo   ERROR: Could not enter server/ directory.
    pause
    exit /b 1
)

if not exist "requirements.txt" (
    echo   ERROR: requirements.txt not found in server/ directory.
    pause
    exit /b 1
)

%PIP_CMD% install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo   ERROR: Python dependency installation failed.
    echo   Check the output above for details.
    pause
    exit /b 1
)

echo   Python dependencies installed successfully.  [OK]
echo.

:: ------------------------------------------------------------------
:: Step 4: Install Node.js dependencies
:: ------------------------------------------------------------------
echo [4/4] Installing Node.js dependencies...

cd /d "%~dp0client"
if %errorlevel% neq 0 (
    echo   ERROR: Could not enter client/ directory.
    pause
    exit /b 1
)

if not exist "package.json" (
    echo   ERROR: package.json not found in client/ directory.
    pause
    exit /b 1
)

call npm install
if %errorlevel% neq 0 (
    echo.
    echo   ERROR: Node.js dependency installation failed.
    echo   Check the output above for details.
    pause
    exit /b 1
)

echo   Node.js dependencies installed successfully.  [OK]

:: ------------------------------------------------------------------
:: Done
:: ------------------------------------------------------------------
cd /d "%~dp0"
echo.
echo ============================================
echo   All dependencies installed successfully!
echo ============================================
echo.
echo   Next steps:
echo     - Start backend:  cd server   then run   python app.py
echo     - Start frontend: cd client   then run   npm run dev
echo.
pause
exit /b 0
