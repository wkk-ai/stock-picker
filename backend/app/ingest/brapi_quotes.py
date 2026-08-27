"""Market quotes: brapi when a token exists, otherwise Yahoo spark for B3 names."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.db import Quote, Stock

SANDBOX = {"PETR4", "VALE3", "MGLU3", "ITUB4"}
YAHOO_UA = "Mozilla/5.0 (compatible; StockPickerBR/0.2; research desk)"


def _headers() -> dict:
    if settings.brapi_token:
        return {"Authorization": f"Bearer {settings.brapi_token}"}
    return {}


def fetch_quote(ticker: str) -> Optional[dict]:
    if not settings.brapi_token:
        return None
    url = f"{settings.brapi_base}/quote/{ticker}"
    params = {"token": settings.brapi_token}
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


def fetch_yahoo_spark(tickers: list[str]) -> dict[str, dict]:
    """Last price and day move for B3 tickers (batch spark API)."""
    out: dict[str, dict] = {}
    headers = {"User-Agent": YAHOO_UA, "Accept": "application/json"}
    for i in range(0, len(tickers), 20):
        chunk = tickers[i : i + 20]
        symbols = ",".join(f"{t}.SA" for t in chunk)
        url = (
            "https://query1.finance.yahoo.com/v7/finance/spark"
            f"?symbols={symbols}&range=1d&interval=1d"
        )
        try:
            with httpx.Client(timeout=25.0, follow_redirects=True, headers=headers) as client:
                r = client.get(url)
                r.raise_for_status()
                data = r.json()
        except Exception:
            continue
        for item in (data.get("spark") or {}).get("result") or []:
            resp = (item.get("response") or [None])[0] or {}
            meta = resp.get("meta") or {}
            price = meta.get("regularMarketPrice")
            prev = meta.get("chartPreviousClose")
            change = None
            if price and prev:
                change = (float(price) / float(prev) - 1.0) * 100.0
            sym = str(item.get("symbol") or "").replace(".SA", "").upper()
            if not sym:
                continue
            out[sym] = {
                "regularMarketPrice": price,
                "regularMarketChangePercent": change,
                "regularMarketVolume": meta.get("regularMarketVolume"),
                "currency": meta.get("currency") or "BRL",
            }
    return out


def upsert_quote(db: Session, stock: Stock, payload: dict):
    q = db.query(Quote).filter(Quote.stock_id == stock.id).one_or_none()
    if not q:
        q = Quote(stock_id=stock.id)
        db.add(q)
    if payload.get("regularMarketPrice") is not None:
        q.price = payload.get("regularMarketPrice")
    if payload.get("regularMarketChangePercent") is not None:
        q.change_percent = payload.get("regularMarketChangePercent")
    if payload.get("marketCap") is not None:
        q.market_cap = payload.get("marketCap")
    if payload.get("regularMarketVolume") is not None:
        q.volume = payload.get("regularMarketVolume")
    q.currency = payload.get("currency") or q.currency or "BRL"
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
    stats = {"fetched": 0, "yahoo": 0, "kept": 0, "fallback": 0}
    stocks = db.query(Stock).filter(Stock.is_active.is_(True)).all()
    yahoo = fetch_yahoo_spark([s.ticker for s in stocks])
    cutoff = datetime.utcnow() - timedelta(seconds=settings.brapi_cache_ttl_seconds)
    for stock in stocks:
        existing = db.query(Quote).filter(Quote.stock_id == stock.id).one_or_none()
        fresh = (
            existing
            and existing.fetched_at
            and existing.fetched_at > cutoff
            and existing.price is not None
            and not force
        )
        payload = fetch_quote(stock.ticker) if settings.brapi_token and not fresh else None
        y = yahoo.get(stock.ticker)
        if payload and payload.get("regularMarketPrice") is not None:
            upsert_quote(db, stock, payload)
            if y and payload.get("regularMarketChangePercent") is None:
                upsert_quote(db, stock, y)
            stats["fetched"] += 1
        elif y and y.get("regularMarketPrice") is not None:
            upsert_quote(db, stock, y)
            stats["yahoo"] += 1
        elif existing and existing.price is not None:
            if y and y.get("regularMarketChangePercent") is not None:
                existing.change_percent = y["regularMarketChangePercent"]
            stats["kept"] += 1
        elif stock.ticker in FALLBACK_PRICES:
            upsert_quote(
                db,
                stock,
                {
                    "regularMarketPrice": FALLBACK_PRICES[stock.ticker],
                    "regularMarketChangePercent": 0.0,
                    "currency": "BRL",
                },
            )
            stats["fallback"] += 1
        else:
            stats["kept"] += 1
    db.commit()
    return stats
