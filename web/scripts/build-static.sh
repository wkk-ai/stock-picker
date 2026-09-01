#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
API_BAK=""
if [ -d web/src/app/api ]; then
  API_BAK="$(mktemp -d)"
  mv web/src/app/api "$API_BAK/api"
fi
restore() {
  if [ -n "$API_BAK" ] && [ -d "$API_BAK/api" ]; then
    mkdir -p web/src/app
    mv "$API_BAK/api" web/src/app/api
    rmdir "$API_BAK" || true
  fi
}
trap restore EXIT
export NEXT_PUBLIC_STATIC_EXPORT=1
export NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/stock-picker}"
npm install --prefix web
npm run build --prefix web
touch web/out/.nojekyll
cp web/out/index.html web/out/404.html
