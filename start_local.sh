#!/usr/bin/env bash

echo "========================================================="
echo "  Starting Offline Excel Data Visualization Platform"
echo "  100% Local • Zero Network • Schema-Agnostic Engine"
echo "========================================================="

# Change directory to script location
CDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$CDIR"

PYTHON_BIN="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_BIN="python"
fi

echo "[1/3] Starting FastAPI Backend on http://127.0.0.1:8000..."
(cd backend && $PYTHON_BIN -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
BACKEND_PID=$!

echo "[2/3] Starting React Frontend on http://127.0.0.1:5173..."
(cd frontend && npm run dev -- --host 127.0.0.1 --port 5173) &
FRONTEND_PID=$!

sleep 3
echo "[3/3] Opening browser at http://127.0.0.1:5173..."
if command -v open &> /dev/null; then
    open http://127.0.0.1:5173
elif command -v xdg-open &> /dev/null; then
    xdg-open http://127.0.0.1:5173
fi

echo "Press Ctrl+C to stop servers."
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
