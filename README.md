# Stock Picker BR

Brazilian stock research dashboard. Decision support from CVM filings, BCB macros, and market quotes — not licensed investment advice.

## Stack

- **API:** FastAPI (Python) + SQLite (Postgres-ready via `DATABASE_URL`)
- **Web:** Next.js + Tailwind
- **Design:** [`design/`](./design/) tokens + wireframes (Penpot-ready)

## Quick start

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.bootstrap   # create DB + seed + sample ingest
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd web
npm install
npm run dev
```

Open http://localhost:3000

## Disclaimer

Scores and bands are educational decision-support tools. They are not recommendations from a CVM-registered securities analyst.
