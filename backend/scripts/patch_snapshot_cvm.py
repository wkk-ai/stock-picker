"""Seed Ibovespa names, pull CVM DFP years, merge compact filings into web snapshot."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.bootstrap import seed_stocks  # noqa: E402
from app.db import FinancialStatement, SessionLocal, Stock, init_db  # noqa: E402
from app.ingest.cvm_dfp_itr import ingest_cvm  # noqa: E402
from app.universe import IBOV_ROWS  # noqa: E402

KEEP_ACCOUNTS = {"NetRevenue", "NetIncome", "OperatingCF", "Equity"}
SNAP = ROOT / "web" / "src" / "data" / "snapshot.json"


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed_stocks(db)
        stats = ingest_cvm(db)
        print("CVM ingest:", {k: stats[k] for k in stats if k != "tickers"})
        print("matched", len(stats.get("matched_tickers") or []), "unmatched", stats.get("unmatched"))

        cvm_by_ticker = {t: c for t, _n, _s, c in IBOV_ROWS}
        compact: dict[str, list[dict]] = {t: [] for t in cvm_by_ticker}
        rows = (
            db.query(FinancialStatement, Stock.ticker)
            .join(Stock, Stock.id == FinancialStatement.stock_id)
            .filter(FinancialStatement.source == "cvm")
            .all()
        )
        for stmt, ticker in rows:
            if stmt.account not in KEEP_ACCOUNTS:
                continue
            if not (stmt.period and stmt.period.isdigit() and len(stmt.period) == 4):
                continue
            compact.setdefault(ticker, []).append(
                {
                    "period": stmt.period,
                    "type": stmt.statement_type,
                    "account": stmt.account,
                    "value": stmt.value,
                    "source": "cvm",
                }
            )
        for ticker, items in compact.items():
            items.sort(key=lambda r: (r["period"], r["account"]))
            years = sorted({r["period"] for r in items})[-3:]
            compact[ticker] = [r for r in items if r["period"] in years]
    finally:
        db.close()

    snap = json.loads(SNAP.read_text())
    missing_years = []
    for stock in snap["stocks"]:
        ticker = stock["ticker"]
        stock["cvm_code"] = cvm_by_ticker.get(ticker, ticker)
        stock["statements"] = compact.get(ticker) or []
        if not stock["statements"]:
            missing_years.append(ticker)
    SNAP.write_text(json.dumps(snap, ensure_ascii=False, indent=2) + "\n")
    with_years = sum(1 for s in snap["stocks"] if s.get("statements"))
    print(f"snapshot {SNAP}: {with_years}/{len(snap['stocks'])} names have CVM years")
    if missing_years:
        print("still no years:", ",".join(missing_years))


if __name__ == "__main__":
    main()
