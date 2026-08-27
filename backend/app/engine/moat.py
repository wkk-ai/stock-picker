from __future__ import annotations

from sqlalchemy.orm import Session

from app.db import MoatProfile, Stock
from app.seed_data import MOAT_SEED, SECTOR_MOAT


def _is_placeholder(row: MoatProfile) -> bool:
    return (
        not (row.summary or "").strip()
        and row.scale == 5
        and row.regulation == 5
        and row.brand == 5
        and row.cost_advantage == 5
    )


def ensure_moat_profiles(db: Session):
    for stock in db.query(Stock).all():
        row = db.query(MoatProfile).filter(MoatProfile.stock_id == stock.id).one_or_none()
        seed = {**SECTOR_MOAT.get(stock.sector, {}), **MOAT_SEED.get(stock.ticker, {})}
        if not row:
            row = MoatProfile(stock_id=stock.id)
            db.add(row)
            for k, v in seed.items():
                setattr(row, k, v)
        elif _is_placeholder(row) and seed:
            for k, v in seed.items():
                setattr(row, k, v)
        elif not row.summary and seed.get("summary"):
            row.summary = seed["summary"]
    db.commit()


def moat_score_from_profile(moat: MoatProfile | None) -> float:
    if not moat:
        return 50.0
    parts = [
        moat.scale,
        moat.regulation,
        moat.brand,
        moat.cost_advantage,
        moat.switching_costs,
        moat.network,
    ]
    # each 1-10 → average * 10
    avg = sum(parts) / len(parts)
    return round(avg * 10, 1)


def update_moat(db: Session, ticker: str, payload: dict) -> MoatProfile | None:
    stock = db.query(Stock).filter(Stock.ticker == ticker.upper()).one_or_none()
    if not stock:
        return None
    row = db.query(MoatProfile).filter(MoatProfile.stock_id == stock.id).one_or_none()
    if not row:
        row = MoatProfile(stock_id=stock.id)
        db.add(row)
    for field in ("scale", "regulation", "brand", "cost_advantage", "switching_costs", "network", "summary"):
        if field in payload and payload[field] is not None:
            setattr(row, field, payload[field])
    db.commit()
    db.refresh(row)
    return row
