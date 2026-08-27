from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.db import Indicator, Stock
from app.seed_data import SEED_INDICATORS


def upsert_indicators_from_seed(db: Session):
    for stock in db.query(Stock).all():
        data = SEED_INDICATORS.get(stock.ticker)
        if not data:
            continue
        row = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
        if not row:
            row = Indicator(stock_id=stock.id)
            db.add(row)
        for k, v in data.items():
            setattr(row, k, v)
        row.source = "seed"
        row.updated_at = datetime.utcnow()
    db.commit()


def compute_from_statements(db: Session, stock: Stock) -> Optional[dict]:
    """If CVM statements exist with NetIncome/Equity, refresh ROE."""
    from app.db import FinancialStatement

    ni = (
        db.query(FinancialStatement)
        .filter(
            FinancialStatement.stock_id == stock.id,
            FinancialStatement.statement_type == "income",
            FinancialStatement.account == "NetIncome",
        )
        .order_by(FinancialStatement.period.desc())
        .first()
    )
    eq = (
        db.query(FinancialStatement)
        .filter(
            FinancialStatement.stock_id == stock.id,
            FinancialStatement.statement_type == "balance",
            FinancialStatement.account == "Equity",
        )
        .order_by(FinancialStatement.period.desc())
        .first()
    )
    if ni and eq and eq.value:
        return {"roe": ni.value / eq.value}
    return None


def refresh_computed_indicators(db: Session):
    for stock in db.query(Stock).all():
        extra = compute_from_statements(db, stock)
        if not extra:
            continue
        row = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
        if not row:
            continue
        if extra.get("roe") is not None:
            row.roe = extra["roe"]
            row.source = "cvm+seed"
            row.updated_at = datetime.utcnow()
    db.commit()
