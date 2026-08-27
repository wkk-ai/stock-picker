"""Fundamentus snapshot — market multiples for B3 names (one HTML table)."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.db import Indicator, Quote, Stock
from app.ingest.httputil import DEFAULT_HEADERS
from app.universe import BANK_LIKE

FUNDAMENTUS_URL = "https://www.fundamentus.com.br/resultado.php"

PCT_FIELDS = {"dividend_yield", "ebitda_margin", "net_margin", "roic", "roe", "revenue_growth"}


def parse_fund_number(raw: str, percent: bool = False) -> Optional[float]:
    s = (raw or "").strip().replace("%", "").replace("\xa0", "")
    if not s or s in {".", "-"}:
        return None
    try:
        if "," in s and "." in s:
            val = float(s.replace(".", "").replace(",", "."))
        elif "," in s:
            val = float(s.replace(",", "."))
        else:
            val = float(s.replace(".", "")) if s.count(".") > 1 else float(s)
    except ValueError:
        return None
    if percent:
        return val / 100.0
    return val


def parse_resultado_html(html: str) -> dict[str, dict]:
    """Map ticker → market multiples from Fundamentus resultado.php."""
    out: dict[str, dict] = {}
    # Each paper row starts with detalhes.php?papel=TICKER
    row_re = re.compile(
        r'detalhes\.php\?papel=([A-Z0-9]+)">.*?</a></span></td>\s*'
        r"((?:<td[^>]*>.*?</td>\s*){21})",
        re.I | re.S,
    )
    td_re = re.compile(r"<td[^>]*>(.*?)</td>", re.I | re.S)
    strip_tags = re.compile(r"<[^>]+>")
    for m in row_re.finditer(html):
        ticker = m.group(1).upper()
        cells = [strip_tags.sub("", c).strip() for c in td_re.findall(m.group(2))]
        if len(cells) < 21:
            continue
        row = {
            "price": parse_fund_number(cells[0]),
            "pe": parse_fund_number(cells[1]),
            "pb": parse_fund_number(cells[2]),
            "dividend_yield": parse_fund_number(cells[4], percent=True),
            "ev_ebitda": parse_fund_number(cells[10]),
            "ebitda_margin": parse_fund_number(cells[12], percent=True),
            "net_margin": parse_fund_number(cells[13], percent=True),
            "current_ratio": parse_fund_number(cells[14]),
            "roic": parse_fund_number(cells[15], percent=True),
            "roe": parse_fund_number(cells[16], percent=True),
            "debt_equity": parse_fund_number(cells[19]),
            "revenue_growth": parse_fund_number(cells[20], percent=True),
        }
        # junk filters: P/L of 0.00 or 999+ is often a broken print
        if row["pe"] is not None and (row["pe"] <= 0 or row["pe"] > 200):
            row["pe"] = None
        if row["pb"] is not None and (row["pb"] <= 0 or row["pb"] > 80):
            row["pb"] = None
        for k in ("ev_ebitda", "current_ratio", "roic", "ebitda_margin", "net_margin"):
            if row.get(k) == 0:
                row[k] = None
        out[ticker] = row
    return out


def fetch_fundamentus() -> dict[str, dict]:
    import httpx

    with httpx.Client(timeout=60.0, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
        r = client.get(FUNDAMENTUS_URL)
        r.raise_for_status()
        text = r.content.decode("latin-1", errors="replace")
    return parse_resultado_html(text)


def ingest_fundamentus(db: Session) -> dict:
    try:
        table = fetch_fundamentus()
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": str(exc)}
    applied = 0
    missing = 0
    for stock in db.query(Stock).filter(Stock.is_active.is_(True)).all():
        row = table.get(stock.ticker)
        if not row:
            missing += 1
            continue
        if row.get("price") is not None:
            q = db.query(Quote).filter(Quote.stock_id == stock.id).one_or_none()
            if not q:
                q = Quote(stock_id=stock.id)
                db.add(q)
            q.price = row["price"]
            q.currency = "BRL"
            q.fetched_at = datetime.utcnow()
        ind = db.query(Indicator).filter(Indicator.stock_id == stock.id).one_or_none()
        if not ind:
            ind = Indicator(stock_id=stock.id)
            db.add(ind)
        skip = {"ev_ebitda", "current_ratio", "debt_equity"} if stock.sector in BANK_LIKE else set()
        for key in (
            "pe",
            "pb",
            "ev_ebitda",
            "dividend_yield",
            "roe",
            "roic",
            "net_margin",
            "ebitda_margin",
            "debt_equity",
            "current_ratio",
            "revenue_growth",
        ):
            if key in skip:
                continue
            val = row.get(key)
            if val is not None:
                setattr(ind, key, val)
        if not (ind.source or "").startswith("cvm"):
            ind.source = "fundamentus"
        ind.updated_at = datetime.utcnow()
        applied += 1
    db.commit()
    return {"status": "ok", "applied": applied, "missing": missing, "rows": len(table)}
