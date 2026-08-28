#!/usr/bin/env bash
# Idempotent bootstrap for the Stock Picker BR dev environment.
# Prepares the FastAPI backend (venv + deps + seeded SQLite DB) and the
# Next.js web app (npm deps). Safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Backend: Python environment"
cd "$ROOT/backend"

create_venv() {
  python3 -m venv .venv
}

# Cursor's default image ships Python 3.12 without the venv/ensurepip module,
# so install it on demand the first time the venv cannot be created.
if [ ! -x .venv/bin/python ]; then
  if ! create_venv 2>/dev/null; then
    echo "==> Installing python3-venv"
    sudo apt-get update -qq
    sudo apt-get install -y -qq python3-venv
    rm -rf .venv
    create_venv
  fi
fi

.venv/bin/python -m pip install --upgrade pip -q
.venv/bin/pip install -r requirements.txt -q

echo "==> Backend: seed database + ingest (idempotent)"
# Uses graceful fallbacks when external data sources are unavailable.
PYTHONPATH=. .venv/bin/python -m app.bootstrap

echo "==> Frontend: npm dependencies"
cd "$ROOT/web"
npm install

echo "==> Install complete"
