from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import settings
from app.db import SessionLocal, init_db

app = FastAPI(title="Stock Picker BR", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")


def _seed_universe():
    from app.bootstrap import seed_defaults, seed_stocks
    from app.engine.indicators import upsert_indicators_from_seed
    from app.engine.moat import ensure_moat_profiles

    db = SessionLocal()
    try:
        seed_stocks(db)
        seed_defaults(db)
        upsert_indicators_from_seed(db)
        ensure_moat_profiles(db)
    finally:
        db.close()


def _ingest_official_data():
    from app.bootstrap import fill_live_data

    fill_live_data(include_cvm=True, include_bcb=True)


@app.on_event("startup")
def on_startup():
    init_db()
    _seed_universe()
    if settings.auto_ingest:
        import threading

        threading.Thread(target=_ingest_official_data, daemon=True, name="official-ingest").start()
