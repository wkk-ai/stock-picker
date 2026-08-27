"""brapi quotes with file/DB cache to respect free-tier limits."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.db import Quote, Stock

SANDBOX = {"PETR4", "VALE3", "MGLU3", "ITUB4"}


def _headers() -> dict:
    if settings.brapi_token:
        return {"Authorization": f"Bearer {settings.brapi_token}"}
    return {}


def fetch_quote(ticker: str) -> Optional[dict]:
    url = f"{settings.brapi_base}/quote/{ticker}"
    params = {}
    if settings.brapi_token:
        params["token"] = settings.brapi_token
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.get(url, params=params, headers=_headers())
            if r.status_code != 200:
                return None
            data = r.json()
            results = data.get("results") or []
            if not results:
                return None
            return results[0]
    except Exception:
        return None


def upsert_quote(db: Session, stock: Stock, payload: dict):
    q = db.query(Quote).filter(Quote.stock_id == stock.id).one_or_none()
    if not q:
        q = Quote(stock_id=stock.id)
        db.add(q)
    q.price = payload.get("regularMarketPrice")
    q.change_percent = payload.get("regularMarketChangePercent")
    q.market_cap = payload.get("marketCap")
    q.volume = payload.get("regularMarketVolume")
    q.currency = payload.get("currency") or "BRL"
    q.fetched_at = datetime.utcnow()


FALLBACK_PRICES = {
    "PETR4": 38.5,
    "VALE3": 62.1,
    "ITUB4": 34.2,
    "BBAS3": 27.8,
    "WEGE3": 52.0,
    "ABEV3": 12.4,
    "BBDC4": 13.1,
    "B3SA3": 11.2,
    "RENT3": 42.0,
    "MGLU3": 8.5,
    "SUZB3": 55.0,
    "PRIO3": 44.0,
}


def ingest_quotes(db: Session, force: bool = False) -> dict:
    stats = {"fetched": 0, "cached": 0, "fallback": 0}
    cutoff = datetime.utcnow() - timedelta(seconds=settings.brapi_cache_ttl_seconds)
    for stock in db.query(Stock).filter(Stock.is_active.is_(True)).all():
        existing = db.query(Quote).filter(Quote.stock_id == stock.id).one_or_none()
        if existing and existing.fetched_at and existing.fetched_at > cutoff and not force:
            stats["cached"] += 1
            continue
        payload = fetch_quote(stock.ticker)
        if payload and payload.get("regularMarketPrice") is not None:
            upsert_quote(db, stock, payload)
            stats["fetched"] += 1
        else:
            # fallback synthetic
            upsert_quote(
                db,
                stock,
                {
                    "regularMarketPrice": FALLBACK_PRICES.get(stock.ticker, 20.0),
                    "regularMarketChangePercent": 0.0,
                    "marketCap": None,
                    "regularMarketVolume": None,
                    "currency": "BRL",
                },
            )
            stats["fallback"] += 1
    db.commit()
    return stats
