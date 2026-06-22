#!/usr/bin/env bash
# ============================================================
#  Pune Weather Forecasting System — One-Click Launcher
#  Usage:  bash run.sh
# ============================================================
set -e
cd "$(dirname "$0")"   # always run from project root

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓] $1${NC}"; }
warn() { echo -e "${YELLOW}[→] $1${NC}"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }

echo ""
echo "  ☁️  Pune Weather Forecasting System"
echo "  ====================================="
echo ""

# ── Check Python 3.9+ ────────────────────────────────────────
command -v python3 &>/dev/null || err "Python 3 not found. Install from https://python.org"
PY_VER=$(python3 -c "import sys; print(sys.version_info.minor)")
[ "$PY_VER" -ge 9 ] || err "Python 3.9+ required. Found 3.$PY_VER"
log "Python 3.$PY_VER"

# ── Virtual environment ───────────────────────────────────────
if [ ! -d "venv" ]; then
  warn "Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
log "Virtual environment active"

# ── Python dependencies ───────────────────────────────────────
warn "Installing/verifying Python packages (first run ~2-3 min)..."
pip install --quiet --upgrade pip
pip install --quiet \
  "fastapi==0.111.0" \
  "uvicorn[standard]==0.30.0" \
  "pydantic==2.7.1" \
  "pydantic-settings==2.3.0" \
  "python-dotenv==1.0.1" \
  "python-multipart==0.0.9" \
  "numpy>=1.24" \
  "pandas>=2.0" \
  "scikit-learn>=1.3" \
  "xgboost>=2.0" \
  "lightgbm>=4.0" \
  "joblib>=1.3" \
  "matplotlib>=3.7" \
  "seaborn>=0.12" \
  "httpx>=0.27"
log "Python packages ready"

# ── Train models if missing ───────────────────────────────────
if [ ! -f "ml/models/xgb_temp.pkl" ]; then
  warn "No trained models found — running training pipeline (~3-5 min)..."
  cd backend
  PYTHONPATH="$(pwd)/.." python3 ../ml/training/train_models.py
  cd ..
  log "Models trained → ml/models/"
else
  log "Trained models found"
fi

# ── .env setup ────────────────────────────────────────────────
[ -f ".env" ] || cp .env.example .env
log ".env ready"

# ── Check Node.js (optional for frontend) ────────────────────
FRONTEND_OK=false
if command -v node &>/dev/null && command -v npm &>/dev/null; then
  NODE_MAJ=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJ" -ge 16 ]; then
    log "Node.js $(node -v) found"
    FRONTEND_OK=true
  else
    warn "Node.js 16+ required for frontend (found v$NODE_MAJ). Backend only."
  fi
else
  warn "Node.js not found — backend only. Install from https://nodejs.org to enable frontend."
fi

# ── Frontend npm install ──────────────────────────────────────
if [ "$FRONTEND_OK" = true ] && [ ! -d "frontend/node_modules" ]; then
  warn "Installing frontend packages (~1-2 min)..."
  cd frontend && npm install --silent && cd ..
  log "Frontend packages installed"
fi

# ── Start Backend ─────────────────────────────────────────────
echo ""
warn "Starting backend API..."

export MODEL_PATH="$(pwd)/ml/models"
export DATA_PATH="$(pwd)/data"

cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level warning &
BACKEND_PID=$!
cd ..

sleep 2
# Quick health check
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
  log "Backend running → http://localhost:8000"
else
  warn "Backend starting (may take a few seconds)..."
fi

# ── Start Frontend ────────────────────────────────────────────
if [ "$FRONTEND_OK" = true ]; then
  warn "Starting React frontend..."
  cd frontend
  BROWSER=none npm start > /tmp/frontend.log 2>&1 &
  FRONTEND_PID=$!
  cd ..
  log "Frontend starting → http://localhost:3000"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║  🌦️  Pune Weather System is running!          ║"
echo "  ╠═══════════════════════════════════════════════╣"
if [ "$FRONTEND_OK" = true ]; then
echo "  ║  Frontend  →  http://localhost:3000           ║"
fi
echo "  ║  API       →  http://localhost:8000/api       ║"
echo "  ║  API Docs  →  http://localhost:8000/api/docs  ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

cleanup() {
  echo ""
  warn "Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
  deactivate 2>/dev/null || true
  echo "  Done. 👋"
}
trap cleanup INT TERM
wait
