@echo off
SETLOCAL EnableDelayedExpansion

echo =========================================================
echo   Starting Offline Excel Data Visualization Platform
echo   100% Local • Zero Network • Schema-Agnostic Engine
echo =========================================================

REM Detect Python executable
SET PYTHON_BIN=python
"C:\Users\saiku\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    SET PYTHON_BIN="C:\Users\saiku\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
)

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Backend Server (FastAPI)" cmd /k "cd /d "%~dp0backend" && %PYTHON_BIN% -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting React Frontend on http://127.0.0.1:5173...
start "Frontend Dev Server (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo =========================================================
echo   Platform initialized successfully!
echo =========================================================
