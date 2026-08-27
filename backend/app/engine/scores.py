from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.db import Indicator, MoatProfile, Score, Stock
from app.engine.advisor import collect_universe, industry_medians
from app.engine.moat import ensure_moat_profiles, moat_score_from_profile
from app.universe import SECTOR_MACRO_SENSITIVITY


WEIGHTS = {"quality": 0.30, "value": 0.25, "moat": 0.30, "macro_fit": 0.15}


def _clamp(x: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, x))


def _relative(value: float | None, industry: float | None, higher_better: bool) -> float:
    if value is None or industry is None or industry == 0:
        return 50.0
    gap = (value - industry) / abs(industry)
    if not higher_better:
        gap = -gap
    return _clamp(50 + gap * 45)


def score_quality(ind: Indicator | None, industry: dict | None = None) -> float:
    abs_score = 50.0
    if not ind:
        return 50.0
    if ind.roe is not None:
        abs_score += _clamp(ind.roe * 100, -20, 30)
    if ind.roic is not None:
        abs_score += _clamp(ind.roic * 80, -10, 20)
    if ind.net_margin is not None:
        abs_score += _clamp(ind.net_margin * 50, -10, 15)
    if ind.debt_equity is not None:
        abs_score -= _clamp((ind.debt_equity - 0.5) * 15, -5, 25)
    if ind.revenue_growth is not None:
        abs_score += _clamp(ind.revenue_growth * 40, -10, 15)
    abs_score = _clamp(abs_score)
    if not industry:
        return abs_score
    rel = []
    for key, better in (("roe", True), ("roic", True), ("net_margin", True), ("revenue_growth", True), ("debt_equity", False)):
        rel.append(_relative(getattr(ind, key, None), industry.get(key), better))
    rel_score = sum(rel) / len(rel)
    return _clamp(0.35 * abs_score + 0.65 * rel_score)


def score_value(ind: Indicator | None, industry: dict | None = None) -> float:
    abs_score = 50.0
    if not ind:
        return 50.0
    if ind.pe is not None and ind.pe > 0:
        abs_score += _clamp(18 - ind.pe, -25, 25)
    if ind.pb is not None and ind.pb > 0:
        abs_score += _clamp(3 - ind.pb, -15, 15) * 3
    if ind.dividend_yield is not None:
        abs_score += _clamp(ind.dividend_yield * 100, 0, 20)
    if ind.ev_ebitda is not None and ind.ev_ebitda > 0:
        abs_score += _clamp(10 - ind.ev_ebitda, -15, 15)
    abs_score = _clamp(abs_score)
    if not industry:
        return abs_score
    rel = []
    for key, better in (("pe", False), ("pb", False), ("ev_ebitda", False), ("dividend_yield", True)):
        rel.append(_relative(getattr(ind, key, None), industry.get(key), better))
    rel_score = sum(rel) / len(rel)
    return _clamp(0.3 * abs_score + 0.7 * rel_score)


def score_macro_fit(sector: str, selic: float | None, ipca: float | None) -> float:
    sens = SECTOR_MACRO_SENSITIVITY.get(sector, {"selic": 0, "ipca": 0, "fx": 0})
    score = 55.0
    # Heuristic: high Selic helps banks, hurts retail/consumer
    if selic is not None:
        score += sens.get("selic", 0) * (selic - 10) * 1.5
    if ipca is not None:
        score += sens.get("ipca", 0) * (4.5 - ipca) * 2
    return _clamp(score)


def band_from_composite(c: float) -> str:
    if c >= 80:
        return "Attractive"
    if c >= 65:
        return "Fair"
    if c >= 50:
        return "Caution"
    return "Avoid"


def recompute_all_scores(db: Session, selic: float | None = None, ipca: float | None = None):
    ensure_moat_profiles(db)
    universe = collect_universe(db)
    sector_med: dict[str, dict] = {}
    for stock in db.query(Stock).all():
        if stock.sector not in sector_med:
            sector_med[stock.sector] = industry_medians(universe, stock.sector)["medians"]
        ind = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
        moat = db.query(MoatProfile).filter(MoatProfile.stock_id == stock.id).one_or_none()
        industry = sector_med.get(stock.sector) or {}
        q = score_quality(ind, industry)
        v = score_value(ind, industry)
        m = moat_score_from_profile(moat)
        mf = score_macro_fit(stock.sector, selic, ipca)
        composite = (
            q * WEIGHTS["quality"]
            + v * WEIGHTS["value"]
            + m * WEIGHTS["moat"]
            + mf * WEIGHTS["macro_fit"]
        )
        row = db.query(Score).filter(Score.stock_id == stock.id).one_or_none()
        if not row:
            row = Score(stock_id=stock.id)
            db.add(row)
        row.quality = round(q, 1)
        row.value = round(v, 1)
        row.moat = round(m, 1)
        row.macro_fit = round(mf, 1)
        row.composite = round(composite, 1)
        row.band = band_from_composite(composite)
        row.rationale = (
            "Score mixes how cheap and how profitable this name is versus its industry, "
            "plus a simple moat and macro check. Not licensed advice."
        )
        row.updated_at = datetime.utcnow()
    db.commit()


def fair_value_models(
    ind: Indicator | None,
    price: float | None,
    industry_pe: float | None = None,
) -> dict:
    """Graham / Bazin plus a price if the stock paid the industry P/L."""
    out = {"graham": None, "bazin": None, "pe_fair": None, "pe_multiple": None, "upside_pct": None}
    if not ind:
        return out
    if price and ind.pe and ind.pb and ind.pe > 0 and ind.pb > 0:
        eps = price / ind.pe
        bvps = price / ind.pb
        out["graham"] = round((22.5 * eps * bvps) ** 0.5, 2)
    target = industry_pe if industry_pe and industry_pe > 0 else 12.0
    out["pe_multiple"] = round(target, 1)
    if price and ind.pe and ind.pe > 0:
        out["pe_fair"] = round(price * (target / ind.pe), 2)
    if ind.dividend_yield and ind.dividend_yield > 0 and price:
        annual_div = price * ind.dividend_yield
        out["bazin"] = round(annual_div / 0.06, 2)
    refs = [v for v in (out["graham"], out["bazin"], out["pe_fair"]) if v]
    if refs and price:
        mid = sum(refs) / len(refs)
        out["upside_pct"] = round((mid / price - 1) * 100, 1)
    return out
