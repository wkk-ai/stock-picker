from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.db import FinancialStatement, Indicator, Stock
from app.seed_data import SEED_INDICATORS

CVM_RATIO_FIELDS = (
    "roe",
    "roa",
    "net_margin",
    "ebitda_margin",
    "debt_equity",
    "current_ratio",
    "revenue_growth",
    "earnings_growth",
)


def upsert_indicators_from_seed(db: Session, fill_missing_only: bool = True):
    for stock in db.query(Stock).all():
        data = SEED_INDICATORS.get(stock.ticker)
        if not data:
            continue
        row = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
        created = False
        if not row:
            row = Indicator(stock_id=stock.id)
            db.add(row)
            created = True
        from_cvm = (row.source or "").startswith("cvm")
        fill = fill_missing_only and not created
        for k, v in data.items():
            current = getattr(row, k, None)
            if fill and current is not None:
                continue
            if from_cvm and k in CVM_RATIO_FIELDS:
                continue
            setattr(row, k, v)
        if not row.source:
            row.source = "seed"
        row.updated_at = datetime.utcnow()
    db.commit()


def _annual_periods(rows: list[FinancialStatement]) -> list[str]:
    periods = sorted({r.period for r in rows if r.period and r.period.isdigit() and len(r.period) == 4})
    return periods


def _value(rows: list[FinancialStatement], period: str, account: str) -> Optional[float]:
    for r in rows:
        if r.period == period and r.account == account and r.value is not None:
            return r.value
    return None


def compute_from_statements(db: Session, stock: Stock) -> Optional[dict]:
    """Ratios from CVM annual statements (full-year DFP, not ITR YTD)."""
    rows = (
        db.query(FinancialStatement)
        .filter(
            FinancialStatement.stock_id == stock.id,
            FinancialStatement.source == "cvm",
        )
        .all()
    )
    if not rows:
        return None
    years = _annual_periods(rows)
    if not years:
        return None
    latest = years[-1]
    prev = years[-2] if len(years) > 1 else None

    ni = _value(rows, latest, "NetIncome")
    equity = _value(rows, latest, "Equity")
    assets = _value(rows, latest, "TotalAssets")
    revenue = _value(rows, latest, "NetRevenue")
    ebit = _value(rows, latest, "EBIT")
    liabilities = _value(rows, latest, "TotalLiabilities")
    current_assets = _value(rows, latest, "CurrentAssets")
    current_liab = _value(rows, latest, "CurrentLiabilities")
    prev_rev = _value(rows, prev, "NetRevenue") if prev else None
    prev_ni = _value(rows, prev, "NetIncome") if prev else None

    out: dict[str, float] = {}
    if ni is not None and equity:
        out["roe"] = ni / equity
    if ni is not None and assets:
        out["roa"] = ni / assets
    if ni is not None and revenue:
        out["net_margin"] = ni / revenue
    if ebit is not None and revenue:
        out["ebitda_margin"] = ebit / revenue
    if liabilities is not None and equity and current_liab is not None:
        out["debt_equity"] = liabilities / equity
    if current_assets is not None and current_liab:
        out["current_ratio"] = current_assets / current_liab
    if revenue is not None and prev_rev:
        out["revenue_growth"] = (revenue / prev_rev) - 1
    if ni is not None and prev_ni:
        out["earnings_growth"] = (ni / prev_ni) - 1
    return out or None


def refresh_computed_indicators(db: Session):
    for stock in db.query(Stock).all():
        extra = compute_from_statements(db, stock)
        if not extra:
            continue
        row = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
        if not row:
            row = Indicator(stock_id=stock.id)
            db.add(row)
        for k, v in extra.items():
            setattr(row, k, v)
        row.source = "cvm"
        row.updated_at = datetime.utcnow()
    db.commit()
