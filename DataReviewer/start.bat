@echo off
echo ====================================
echo  Pathology Report Reviewer - Start
echo ====================================
echo.

REM ── Stop any existing servers ────────────────────────────────────────────────
echo Stopping any existing servers on ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM ── Choose python: prefer venv, fall back to system ──────────────────────────
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set PYTHON="%~dp0backend\venv\Scripts\python.exe"
) else (
    set PYTHON=python
)

REM ── Start backend ────────────────────────────────────────────────────────────
echo Starting backend...
start "Pathology Backend" cmd /k "%PYTHON% -m uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir %~dp0backend"
timeout /t 4 /nobreak >nul

REM ── Start frontend ───────────────────────────────────────────────────────────
echo Starting frontend...
start "Pathology Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo ====================================
echo  App:      http://localhost:5173
echo  API docs: http://127.0.0.1:8000/docs
echo ====================================
start http://localhost:5173
