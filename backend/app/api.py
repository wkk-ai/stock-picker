from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import (
    AlertRule,
    FinancialStatement,
    Indicator,
    MoatProfile,
    NewsItem,
    PortfolioPosition,
    Quote,
    Score,
    Stock,
    ThesisNote,
    WatchlistItem,
    get_db,
)
from app.engine.advisor import analyze_stock
from app.engine.moat import update_moat
from app.engine.scores import WEIGHTS, fair_value_models, recompute_all_scores
from app.ingest.bcb_sgs import ingest_bcb, latest_macros, macro_value
from app.ingest.brapi_quotes import ingest_quotes
from app.ingest.cvm_dfp_itr import ingest_cvm
from app.ingest.fundamentus import ingest_fundamentus
from app.ingest.news import ingest_news
from app.schemas import (
    AlertIn,
    MoatUpdate,
    PortfolioIn,
    StockDetail,
    StockListItem,
    ThesisIn,
    WatchIn,
)

router = APIRouter()

DISCLAIMER = (
    "Decision support only — not licensed investment advice under CVM rules. "
    "Scores are transparent heuristics, not recommendations from a registered analyst."
)


def _list_item(stock: Stock, db: Session) -> StockListItem:
    q = db.query(Quote).filter(Quote.stock_id == stock.id).one_or_none()
    ind = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
    sc = db.query(Score).filter(Score.stock_id == stock.id).one_or_none()
    return StockListItem(
        ticker=stock.ticker,
        name=stock.name,
        sector=stock.sector,
        price=q.price if q else None,
        change_percent=q.change_percent if q else None,
        pe=ind.pe if ind else None,
        roe=ind.roe if ind else None,
        composite=sc.composite if sc else None,
        band=sc.band if sc else None,
    )


@router.get("/health")
def health():
    return {"ok": True, "disclaimer": DISCLAIMER}


@router.get("/disclaimer")
def disclaimer():
    return {"disclaimer": DISCLAIMER, "score_weights": WEIGHTS}


@router.get("/macros")
def macros(db: Session = Depends(get_db)):
    items = latest_macros(db)
    live = any(m.get("value") is not None for m in items)
    return {
        "items": items,
        "disclaimer": DISCLAIMER,
        "source": "BCB SGS",
        "live": live,
    }


@router.get("/data-status")
def data_status(db: Session = Depends(get_db)):
    macros = latest_macros(db)
    cvm_rows = (
        db.query(FinancialStatement)
        .filter(FinancialStatement.source == "cvm")
        .count()
    )
    tickers = [
        t[0]
        for t in (
            db.query(Stock.ticker)
            .join(FinancialStatement, FinancialStatement.stock_id == Stock.id)
            .filter(FinancialStatement.source == "cvm")
            .distinct()
            .all()
        )
    ]
    periods = [
        p[0]
        for p in (
            db.query(FinancialStatement.period)
            .filter(FinancialStatement.source == "cvm")
            .distinct()
            .all()
        )
    ]
    annual = sorted(p for p in periods if p and p.isdigit() and len(p) == 4)
    universe = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    return {
        "live_bcb": any(m.get("value") is not None for m in macros),
        "live_cvm": cvm_rows > 0,
        "universe": universe,
        "bcb": macros,
        "cvm": {
            "rows": cvm_rows,
            "tickers": tickers,
            "periods": sorted(periods),
            "annual_years": annual,
        },
        "disclaimer": DISCLAIMER,
    }


@router.get("/stocks", response_model=list[StockListItem])
def list_stocks(db: Session = Depends(get_db)):
    stocks = db.query(Stock).filter(Stock.is_active.is_(True)).order_by(Stock.ticker).all()
    return [_list_item(s, db) for s in stocks]


@router.get("/screener", response_model=list[StockListItem])
def screener(
    sector: Optional[str] = None,
    max_pe: Optional[float] = None,
    min_roe: Optional[float] = None,
    min_score: Optional[float] = None,
    preset: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if preset == "quality":
        min_roe = min_roe if min_roe is not None else 0.15
        min_score = min_score if min_score is not None else 70
    elif preset == "value":
        max_pe = max_pe if max_pe is not None else 10
        min_score = min_score if min_score is not None else 55

    items = []
    for s in db.query(Stock).filter(Stock.is_active.is_(True)).all():
        if sector and s.sector.lower() != sector.lower():
            continue
        ind = db.query(Indicator).filter(Indicator.stock_id == s.id).one_or_none()
        sc = db.query(Score).filter(Score.stock_id == s.id).one_or_none()
        if max_pe is not None and (not ind or ind.pe is None or ind.pe > max_pe):
            continue
        if min_roe is not None and (not ind or ind.roe is None or ind.roe < min_roe):
            continue
        if min_score is not None and (not sc or sc.composite < min_score):
            continue
        items.append(_list_item(s, db))
    items.sort(key=lambda x: x.composite or 0, reverse=True)
    return items


@router.get("/sectors")
def list_sectors(db: Session = Depends(get_db)):
    buckets: dict[str, int] = {}
    for s in db.query(Stock).filter(Stock.is_active.is_(True)).all():
        buckets[s.sector] = buckets.get(s.sector, 0) + 1
    return {"sectors": [{"sector": k, "count": v} for k, v in sorted(buckets.items())]}


@router.get("/sectors/heatmap")
def sector_heatmap(db: Session = Depends(get_db)):
    buckets: dict[str, list[float]] = {}
    for s in db.query(Stock).all():
        sc = db.query(Score).filter(Score.stock_id == s.id).one_or_none()
        if not sc:
            continue
        buckets.setdefault(s.sector, []).append(sc.composite)
    return {
        "sectors": [
            {"sector": k, "avg_score": round(sum(v) / len(v), 1), "count": len(v)}
            for k, v in sorted(buckets.items(), key=lambda x: -sum(x[1]) / len(x[1]))
        ]
    }


def _checklist_from_analysis(analysis: dict) -> list[dict]:
    items = []
    for c in analysis.get("checklist") or []:
        items.append(
            {
                "key": c.get("key"),
                "label": c.get("question") or c.get("label"),
                "ok": bool(c.get("ok")),
                "detail": c.get("detail"),
            }
        )
    return items


@router.get("/stocks/{ticker}", response_model=StockDetail)
def stock_detail(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(Stock).filter(Stock.ticker == ticker.upper()).one_or_none()
    if not stock:
        raise HTTPException(404, "Ticker not found")
    q = db.query(Quote).filter(Quote.stock_id == stock.id).one_or_none()
    ind = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
    sc = db.query(Score).filter(Score.stock_id == stock.id).one_or_none()
    moat = db.query(MoatProfile).filter(MoatProfile.stock_id == stock.id).one_or_none()
    stmts = (
        db.query(FinancialStatement)
        .filter(FinancialStatement.stock_id == stock.id)
        .all()
    )
    account_rank = {
        "NetRevenue": 0,
        "GrossProfit": 1,
        "EBIT": 2,
        "NetIncome": 3,
        "TotalAssets": 4,
        "CurrentAssets": 5,
        "CurrentLiabilities": 6,
        "NonCurrentLiabilities": 7,
        "TotalLiabilities": 8,
        "Equity": 9,
        "OperatingCF": 10,
        "InvestingCF": 11,
        "FinancingCF": 12,
    }
    stmts.sort(
        key=lambda s: (
            s.period or "",
            -account_rank.get(s.account, 50),
            s.account,
        ),
        reverse=True,
    )
    stmts = stmts[:80]
    news = (
        db.query(NewsItem)
        .filter((NewsItem.stock_id == stock.id) | (NewsItem.stock_id.is_(None)))
        .order_by(NewsItem.id.desc())
        .limit(15)
        .all()
    )
    peers_raw = [
        _list_item(p, db)
        for p in db.query(Stock).filter(Stock.sector == stock.sector, Stock.id != stock.id).all()
    ]
    macros = latest_macros(db)
    analysis = analyze_stock(db, stock, selic=macro_value(macros, "SELIC"))
    analysis_peers = analysis.get("peers") or []
    peers = analysis_peers or [p.model_dump() for p in peers_raw]
    thesis = db.query(ThesisNote).filter(ThesisNote.ticker == stock.ticker).one_or_none()
    thesis_out = None
    if thesis:
        thesis_out = {
            "bull": thesis.bull,
            "base": thesis.base,
            "bear": thesis.bear,
            "checklist": json.loads(thesis.checklist_json or "{}"),
        }
    return StockDetail(
        ticker=stock.ticker,
        name=stock.name,
        sector=stock.sector,
        quote={
            "price": q.price if q else None,
            "change_percent": q.change_percent if q else None,
            "market_cap": q.market_cap if q else None,
            "volume": q.volume if q else None,
            "fetched_at": q.fetched_at.isoformat() if q and q.fetched_at else None,
        }
        if q
        else None,
        indicators={
            "pe": ind.pe,
            "pb": ind.pb,
            "ev_ebitda": ind.ev_ebitda,
            "dividend_yield": ind.dividend_yield,
            "roe": ind.roe,
            "roa": ind.roa,
            "roic": ind.roic,
            "net_margin": ind.net_margin,
            "ebitda_margin": ind.ebitda_margin,
            "debt_equity": ind.debt_equity,
            "current_ratio": ind.current_ratio,
            "revenue_growth": ind.revenue_growth,
            "earnings_growth": ind.earnings_growth,
            "source": ind.source,
        }
        if ind
        else None,
        score={
            "quality": sc.quality,
            "value": sc.value,
            "moat": sc.moat,
            "macro_fit": sc.macro_fit,
            "composite": sc.composite,
            "band": sc.band,
            "rationale": sc.rationale,
        }
        if sc
        else None,
        moat={
            "scale": moat.scale,
            "regulation": moat.regulation,
            "brand": moat.brand,
            "cost_advantage": moat.cost_advantage,
            "switching_costs": moat.switching_costs,
            "network": moat.network,
            "summary": moat.summary,
        }
        if moat
        else None,
        fair_value=fair_value_models(
            ind,
            q.price if q else None,
            industry_pe=(analysis.get("implied") or {}).get("industry_pe"),
        ),
        statements=[
            {
                "period": s.period,
                "type": s.statement_type,
                "account": s.account,
                "value": s.value,
                "source": s.source,
            }
            for s in stmts
        ],
        news=[
            {
                "title": n.title,
                "url": n.url,
                "source": n.source,
                "published_at": n.published_at,
                "summary": n.summary,
            }
            for n in news
        ],
        peers=peers,
        thesis=thesis_out,
        checklist=_checklist_from_analysis(analysis),
        analysis=analysis,
    )


@router.put("/stocks/{ticker}/moat")
def put_moat(ticker: str, body: MoatUpdate, db: Session = Depends(get_db)):
    row = update_moat(db, ticker, body.model_dump(exclude_unset=True))
    if not row:
        raise HTTPException(404, "Ticker not found")
    macros = latest_macros(db)
    recompute_all_scores(
        db,
        selic=macro_value(macros, "SELIC"),
        ipca=macro_value(macros, "IPCA_12M") or macro_value(macros, "IPCA"),
    )
    return {"ok": True}


@router.put("/stocks/{ticker}/thesis")
def put_thesis(ticker: str, body: ThesisIn, db: Session = Depends(get_db)):
    t = ticker.upper()
    if not db.query(Stock).filter(Stock.ticker == t).one_or_none():
        raise HTTPException(404, "Ticker not found")
    row = db.query(ThesisNote).filter(ThesisNote.ticker == t).one_or_none()
    if not row:
        row = ThesisNote(ticker=t)
        db.add(row)
    row.bull = body.bull
    row.base = body.base
    row.bear = body.bear
    row.checklist_json = json.dumps(body.checklist)
    db.commit()
    return {"ok": True}


@router.get("/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    items = db.query(WatchlistItem).all()
    out = []
    for w in items:
        s = db.query(Stock).filter(Stock.ticker == w.ticker).one_or_none()
        if s:
            item = _list_item(s, db).model_dump()
            item["note"] = w.note
            out.append(item)
    return out


@router.post("/watchlist")
def add_watch(body: WatchIn, db: Session = Depends(get_db)):
    t = body.ticker.upper()
    if not db.query(Stock).filter(Stock.ticker == t).one_or_none():
        raise HTTPException(404, "Ticker not found")
    if not db.query(WatchlistItem).filter(WatchlistItem.ticker == t).one_or_none():
        db.add(WatchlistItem(ticker=t, note=body.note))
        db.commit()
    return {"ok": True}


@router.delete("/watchlist/{ticker}")
def del_watch(ticker: str, db: Session = Depends(get_db)):
    db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker.upper()).delete()
    db.commit()
    return {"ok": True}


@router.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    positions = db.query(PortfolioPosition).all()
    rows = []
    total = 0.0
    for p in positions:
        s = db.query(Stock).filter(Stock.ticker == p.ticker).one_or_none()
        q = db.query(Quote).filter(Quote.stock_id == s.id).one_or_none() if s else None
        price = q.price if q and q.price else p.avg_price
        value = price * p.quantity
        total += value
        rows.append(
            {
                "ticker": p.ticker,
                "quantity": p.quantity,
                "avg_price": p.avg_price,
                "price": price,
                "value": value,
                "pnl_pct": ((price / p.avg_price) - 1) * 100 if p.avg_price else 0,
                "sector": s.sector if s else "",
                "note": p.note,
            }
        )
    for r in rows:
        r["weight"] = (r["value"] / total * 100) if total else 0
    # concentration
    by_sector: dict[str, float] = {}
    for r in rows:
        by_sector[r["sector"]] = by_sector.get(r["sector"], 0) + r["weight"]
    warnings = [f"{k} is {v:.0f}% of portfolio" for k, v in by_sector.items() if v >= 35]
    return {
        "equity": total,
        "positions": rows,
        "allocation": [{"sector": k, "weight": round(v, 1)} for k, v in by_sector.items()],
        "warnings": warnings,
        "disclaimer": DISCLAIMER,
    }


@router.post("/portfolio")
def upsert_position(body: PortfolioIn, db: Session = Depends(get_db)):
    t = body.ticker.upper()
    if not db.query(Stock).filter(Stock.ticker == t).one_or_none():
        raise HTTPException(404, "Ticker not found")
    row = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == t).one_or_none()
    if not row:
        row = PortfolioPosition(ticker=t)
        db.add(row)
    row.quantity = body.quantity
    row.avg_price = body.avg_price
    row.note = body.note
    db.commit()
    return {"ok": True}


@router.delete("/portfolio/{ticker}")
def del_position(ticker: str, db: Session = Depends(get_db)):
    db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker.upper()).delete()
    db.commit()
    return {"ok": True}


@router.get("/alerts")
def list_alerts(db: Session = Depends(get_db)):
    # evaluate simple price alerts
    alerts = db.query(AlertRule).all()
    for a in alerts:
        if a.kind == "price" and a.ticker and a.threshold is not None:
            s = db.query(Stock).filter(Stock.ticker == a.ticker.upper()).one_or_none()
            if not s:
                continue
            q = db.query(Quote).filter(Quote.stock_id == s.id).one_or_none()
            if q and q.price is not None and q.price <= a.threshold:
                a.status = "Triggered"
            else:
                a.status = "Armed"
        elif a.kind == "indicator" and a.ticker and a.threshold is not None:
            s = db.query(Stock).filter(Stock.ticker == a.ticker.upper()).one_or_none()
            if not s:
                continue
            ind = db.query(Indicator).filter(Indicator.stock_id == s.id).one_or_none()
            if ind and ind.pe is not None and ind.pe <= a.threshold:
                a.status = "Triggered"
    db.commit()
    return [
        {
            "id": a.id,
            "kind": a.kind,
            "ticker": a.ticker,
            "rule": a.rule,
            "threshold": a.threshold,
            "status": a.status,
        }
        for a in alerts
    ]


@router.post("/alerts")
def create_alert(body: AlertIn, db: Session = Depends(get_db)):
    a = AlertRule(kind=body.kind, ticker=body.ticker, rule=body.rule, threshold=body.threshold)
    db.add(a)
    db.commit()
    return {"ok": True, "id": a.id}


@router.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    db.query(AlertRule).filter(AlertRule.id == alert_id).delete()
    db.commit()
    return {"ok": True}


@router.get("/news")
def all_news(ticker: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(NewsItem).order_by(NewsItem.id.desc()).limit(50)
    if ticker:
        s = db.query(Stock).filter(Stock.ticker == ticker.upper()).one_or_none()
        if s:
            q = db.query(NewsItem).filter(NewsItem.stock_id == s.id).order_by(NewsItem.id.desc()).limit(50)
    return [
        {
            "title": n.title,
            "url": n.url,
            "source": n.source,
            "published_at": n.published_at,
            "summary": n.summary,
        }
        for n in q.all()
    ]


@router.get("/compare")
def compare(a: str = Query(...), b: str = Query(...), db: Session = Depends(get_db)):
    left = db.query(Stock).filter(Stock.ticker == a.upper()).one_or_none()
    right = db.query(Stock).filter(Stock.ticker == b.upper()).one_or_none()
    if not left or not right:
        raise HTTPException(404, "Ticker not found")
    return {"a": _list_item(left, db), "b": _list_item(right, db)}


@router.get("/export/screener.csv")
def export_csv(db: Session = Depends(get_db)):
    from fastapi.responses import PlainTextResponse

    lines = ["ticker,name,sector,price,pe,roe,score,band"]
    for s in db.query(Stock).all():
        item = _list_item(s, db)
        lines.append(
            f"{item.ticker},{item.name.replace(',', ' ')},{item.sector},{item.price},{item.pe},{item.roe},{item.composite},{item.band}"
        )
    return PlainTextResponse("\n".join(lines), media_type="text/csv")


@router.post("/admin/ingest")
def run_ingest(
    include_cvm: bool = True,
    include_bcb: bool = True,
    include_quotes: bool = True,
    include_news: bool = True,
    include_fundamentus: bool = True,
    db: Session = Depends(get_db),
):
    from app.bootstrap import seed_defaults, seed_stocks
    from app.engine.indicators import refresh_computed_indicators, upsert_indicators_from_seed
    from app.engine.moat import ensure_moat_profiles

    seed_stocks(db)
    seed_defaults(db)
    ensure_moat_profiles(db)
    result = {}
    if include_fundamentus:
        result["fundamentus"] = ingest_fundamentus(db)
    if include_bcb:
        result["bcb"] = ingest_bcb(db)
    if include_cvm:
        result["cvm"] = ingest_cvm(db)
    if include_quotes:
        result["quotes"] = ingest_quotes(db)
    if include_news:
        try:
            result["news"] = ingest_news(db)
        except Exception as exc:  # noqa: BLE001
            result["news"] = {"error": str(exc)}
    macros = latest_macros(db)
    selic = macro_value(macros, "SELIC")
    ipca = macro_value(macros, "IPCA_12M") or macro_value(macros, "IPCA")
    upsert_indicators_from_seed(db, fill_missing_only=True)
    refresh_computed_indicators(db)
    recompute_all_scores(db, selic=selic, ipca=ipca)
    result["scores"] = "recomputed"
    result["selic"] = selic
    result["ipca_12m"] = ipca
    result["universe"] = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    return result


@router.get("/scenario")
def scenario(selic_delta: float = 0.0, db: Session = Depends(get_db)):
    """Heuristic sector impact if Selic moves by selic_delta percentage points."""
    from app.seed_data import SECTOR_MACRO_SENSITIVITY

    return {
        "selic_delta": selic_delta,
        "impacts": [
            {
                "sector": sector,
                "score_nudge": round(sens.get("selic", 0) * selic_delta * 3, 1),
                "note": "Heuristic only",
            }
            for sector, sens in SECTOR_MACRO_SENSITIVITY.items()
        ],
        "disclaimer": DISCLAIMER,
    }
