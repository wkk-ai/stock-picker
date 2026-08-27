"""Initialize DB, seed universe, run ingest + scores."""
from __future__ import annotations

from app.db import AlertRule, PortfolioPosition, SessionLocal, Stock, WatchlistItem, init_db
from app.engine.indicators import refresh_computed_indicators, upsert_indicators_from_seed
from app.engine.moat import ensure_moat_profiles
from app.engine.scores import recompute_all_scores
from app.ingest.bcb_sgs import ingest_bcb, latest_macros
from app.ingest.brapi_quotes import ingest_quotes
from app.ingest.cvm_dfp_itr import ingest_cvm
from app.ingest.news import ingest_news
from app.seed_data import SEED_STOCKS


def seed_stocks(db):
    for row in SEED_STOCKS:
        if not db.query(Stock).filter(Stock.ticker == row["ticker"]).one_or_none():
            db.add(Stock(**row))
    db.commit()


def seed_defaults(db):
    if db.query(WatchlistItem).count() == 0:
        for t in ("PETR4", "VALE3", "ITUB4", "WEGE3"):
            db.add(WatchlistItem(ticker=t))
    if db.query(AlertRule).count() == 0:
        db.add(AlertRule(kind="price", ticker="PETR4", rule="PETR4 < 36", threshold=36))
        db.add(AlertRule(kind="indicator", ticker="VALE3", rule="VALE3 P/L < 5", threshold=5))
        db.add(AlertRule(kind="filing", ticker=None, rule="New ITR any watchlist", threshold=None))
    if db.query(PortfolioPosition).count() == 0:
        db.add(PortfolioPosition(ticker="ITUB4", quantity=400, avg_price=28.1))
        db.add(PortfolioPosition(ticker="PETR4", quantity=300, avg_price=35.0))
        db.add(PortfolioPosition(ticker="WEGE3", quantity=100, avg_price=40.0))
    db.commit()


def main():
    init_db()
    db = SessionLocal()
    try:
        seed_stocks(db)
        seed_defaults(db)
        upsert_indicators_from_seed(db)
        ensure_moat_profiles(db)
        print("BCB ingest:", ingest_bcb(db))
        print("CVM ingest:", ingest_cvm(db))
        print("Quotes ingest:", ingest_quotes(db))
        try:
            print("News ingest:", ingest_news(db))
        except Exception as exc:  # noqa: BLE001
            print("News ingest skipped:", exc)
        refresh_computed_indicators(db)
        macros = latest_macros(db)
        selic = next((m["value"] for m in macros if m["code"] == "SELIC"), None)
        ipca = next((m["value"] for m in macros if m["code"] == "IPCA"), None)
        recompute_all_scores(db, selic=selic, ipca=ipca)
        print("Bootstrap complete. Selic=", selic, "IPCA=", ipca)
    finally:
        db.close()


if __name__ == "__main__":
    main()
