@echo off
echo ============================================
echo  Pathology Report Reviewer - Environment Setup
echo ============================================
echo.

REM ── Python virtual environment ──────────────────────────────────────────────

echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
python --version

echo.
echo [2/4] Creating Python virtual environment in backend\venv ...
if exist "%~dp0backend\venv" (
    echo       venv already exists, skipping creation.
) else (
    python -m venv "%~dp0backend\venv"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo       Created.
)

echo.
echo [3/4] Installing Python dependencies...
call "%~dp0backend\venv\Scripts\activate.bat"
pip install -r "%~dp0backend\requirements.txt" --quiet
if errorlevel 1 (
    echo ERROR: pip install failed. Check requirements.txt and your internet connection.
    pause
    exit /b 1
)
echo       Done.

REM ── Node / npm ───────────────────────────────────────────────────────────────

echo.
echo [4/4] Installing frontend npm dependencies...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
cd /d "%~dp0frontend"
npm install --silent
if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo       Done.

echo.
echo ============================================
echo  Setup complete!
echo.
echo  To start the app, run:  start.bat
echo ============================================
echo.
pause
