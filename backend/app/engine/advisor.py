"""Advisor-style comparison: every metric versus industry, in plain language."""
from __future__ import annotations

from statistics import median
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db import FinancialStatement, Indicator, Quote, Score, Stock
from app.universe import BANK_LIKE, SECTOR_CAVEATS, SECTOR_GROUP

METRIC_SPECS = [
    {"key": "pe", "label": "Years of profit you pay (P/L)", "plain": "How many years of this year’s profit today’s price buys", "unit": "x", "higher_better": False, "kind": "value", "skip_sectors": set(), "peer": True},
    {"key": "pb", "label": "Price vs book equity (P/VP)", "plain": "Price compared with the equity sitting on the books", "unit": "x", "higher_better": False, "kind": "value", "skip_sectors": set(), "peer": True},
    {"key": "ev_ebitda", "label": "Whole-company price vs operating profit", "plain": "Price of shares plus net debt, versus operating profit", "unit": "x", "higher_better": False, "kind": "value", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "ps", "label": "Years of sales the price buys (P/S)", "plain": "How many years of sales the market price buys", "unit": "x", "higher_better": False, "kind": "value", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "ev_sales", "label": "Whole-company price vs sales", "plain": "Price of shares plus net debt, versus a year of sales", "unit": "x", "higher_better": False, "kind": "value", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "peg", "label": "Price vs profit, adjusted for growth", "plain": "P/L divided by profit growth", "unit": "x", "higher_better": False, "kind": "value", "skip_sectors": set(), "peer": True},
    {"key": "earnings_yield", "label": "Yearly profit as a % of the price", "plain": "The profit return you get at today’s price if earnings hold", "unit": "%", "higher_better": True, "kind": "value", "skip_sectors": set(), "peer": True},
    {"key": "ebitda_yield", "label": "Operating profit as a % of company value", "plain": "Operating profit divided by whole-company price", "unit": "%", "higher_better": True, "kind": "value", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "earnings_vs_selic", "label": "Profit yield vs Brazil’s interest rate", "plain": "How the stock’s profit yield compares with Brazil’s key rate", "unit": "pp", "higher_better": True, "kind": "macro", "skip_sectors": set(), "peer": True},
    {"key": "real_earnings_yield", "label": "Profit yield after inflation", "plain": "Earnings yield minus 12-month inflation", "unit": "pp", "higher_better": True, "kind": "macro", "skip_sectors": set(), "peer": True},
    {"key": "roic_vs_selic", "label": "Business return vs Brazil’s interest rate", "plain": "Profit on invested capital minus Brazil’s key rate", "unit": "pp", "higher_better": True, "kind": "macro", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "dividend_yield", "label": "Cash dividend vs the price", "plain": "Cash dividends over the last year as a % of the share price", "unit": "%", "higher_better": True, "kind": "income", "skip_sectors": set(), "peer": True},
    {"key": "dy_vs_selic", "label": "Dividend vs Brazil’s interest rate", "plain": "Dividend yield minus Brazil’s key rate", "unit": "pp", "higher_better": True, "kind": "income", "skip_sectors": set(), "peer": True},
    {"key": "payout", "label": "Share of profit paid as dividends", "plain": "Share of yearly profit paid as dividends", "unit": "%", "higher_better": False, "kind": "income", "skip_sectors": set(), "peer": True},
    {"key": "div_coverage", "label": "How many times profit covers the dividend", "plain": "How many times earnings cover the dividend", "unit": "x", "higher_better": True, "kind": "income", "skip_sectors": set(), "peer": True},
    {"key": "retention", "label": "Share of profit kept in the business", "plain": "The part of profit not paid as dividends", "unit": "%", "higher_better": True, "kind": "income", "skip_sectors": set(), "peer": True},
    {"key": "roe", "label": "Profit on owners’ money (ROE)", "plain": "Profit the company earns on its own equity", "unit": "%", "higher_better": True, "kind": "quality", "skip_sectors": set(), "peer": True},
    {"key": "roa", "label": "Profit on all assets (ROA)", "plain": "Profit earned on everything the company owns", "unit": "%", "higher_better": True, "kind": "quality", "skip_sectors": set(), "peer": True},
    {"key": "roic", "label": "Profit on money used in the business (ROIC)", "plain": "Return on the capital actually used to run the business", "unit": "%", "higher_better": True, "kind": "quality", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "net_margin", "label": "Profit left from each real of sales", "plain": "How many cents of profit remain from each real of sales", "unit": "%", "higher_better": True, "kind": "quality", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "ebitda_margin", "label": "Operating profit from each real of sales", "plain": "Operating profit from each real of sales, before interest and tax", "unit": "%", "higher_better": True, "kind": "quality", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "asset_turnover", "label": "Sales generated from the company’s assets", "plain": "How much sales the company gets from the assets it owns", "unit": "x", "higher_better": True, "kind": "quality", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "revenue_growth", "label": "Did sales grow last year?", "plain": "Whether last year’s sales beat the year before", "unit": "%", "higher_better": True, "kind": "growth", "skip_sectors": set(), "peer": True},
    {"key": "earnings_growth", "label": "Did profit grow last year?", "plain": "Whether last year’s profit beat the year before", "unit": "%", "higher_better": True, "kind": "growth", "skip_sectors": set(), "peer": True},
    {"key": "sustainable_growth", "label": "Growth the dividend still allows", "plain": "ROE times the share of profit kept in the business", "unit": "%", "higher_better": True, "kind": "growth", "skip_sectors": set(), "peer": True},
    {"key": "debt_equity", "label": "Borrowed money vs owners’ money", "plain": "How leveraged the balance sheet is", "unit": "x", "higher_better": False, "kind": "risk", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "current_ratio", "label": "Can it pay bills due soon?", "plain": "Short-term assets versus bills due soon", "unit": "x", "higher_better": True, "kind": "risk", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "financial_leverage", "label": "How much ROE rides on borrowed money", "plain": "ROE divided by ROA", "unit": "x", "higher_better": False, "kind": "risk", "skip_sectors": BANK_LIKE, "peer": True},
    {"key": "lpa", "label": "Profit for one share, in reais", "plain": "Last year’s profit in reais per share", "unit": "R$", "higher_better": True, "kind": "fact", "skip_sectors": set(), "peer": False},
    {"key": "vpa", "label": "Book equity for one share, in reais", "plain": "Book equity in reais per share", "unit": "R$", "higher_better": True, "kind": "fact", "skip_sectors": set(), "peer": False},
    {"key": "graham", "label": "Graham textbook price", "plain": "A classic shortcut from profit-per-share and book-per-share", "unit": "R$", "higher_better": True, "kind": "fact", "skip_sectors": set(), "peer": False},
]


def enrich_derived(row: dict, selic: float | None = None, ipca: float | None = None) -> dict:
    pe = row.get("pe")
    pb = row.get("pb")
    price = row.get("price")
    dy = row.get("dividend_yield")
    eg = row.get("earnings_growth")
    nm = row.get("net_margin")
    roa = row.get("roa")
    roe = row.get("roe")
    roic = row.get("roic")
    ev = row.get("ev_ebitda")
    ebitda_m = row.get("ebitda_margin")
    selic_dec = selic / 100.0 if selic is not None else None
    ipca_dec = ipca / 100.0 if ipca is not None else None
    if pe and pe > 0:
        row["earnings_yield"] = 1.0 / pe
        if price:
            row["lpa"] = price / pe
        if dy is not None:
            row["payout"] = dy * pe
            if row["payout"]:
                row["div_coverage"] = 1.0 / row["payout"]
        if nm is not None:
            row["ps"] = pe * nm
        if selic_dec is not None:
            row["earnings_vs_selic"] = row["earnings_yield"] - selic_dec
        if ipca_dec is not None:
            row["real_earnings_yield"] = row["earnings_yield"] - ipca_dec
    if pb and pb > 0 and price:
        row["vpa"] = price / pb
    if pe and pe > 0 and eg is not None and eg > 0.02:
        row["peg"] = pe / (eg * 100.0)
    if roa is not None and nm:
        row["asset_turnover"] = roa / nm
    if dy is not None and selic_dec is not None:
        row["dy_vs_selic"] = dy - selic_dec
    if ev and ev > 0:
        row["ebitda_yield"] = 1.0 / ev
        if ebitda_m is not None:
            row["ev_sales"] = ev * ebitda_m
    if roic is not None and selic_dec is not None:
        row["roic_vs_selic"] = roic - selic_dec
    payout = row.get("payout")
    if payout is not None:
        row["retention"] = 1.0 - payout
        if roe is not None:
            row["sustainable_growth"] = roe * (1.0 - payout)
    if roe is not None and roa:
        row["financial_leverage"] = roe / roa
    lpa = row.get("lpa")
    vpa = row.get("vpa")
    if lpa and vpa and lpa > 0 and vpa > 0:
        row["graham"] = round((22.5 * lpa * vpa) ** 0.5, 2)
    return row


def _median(values: list[float]) -> Optional[float]:
    clean = [v for v in values if v is not None]
    if len(clean) < 2:
        return None
    return float(median(clean))


def _ind_map(ind: Indicator | None) -> dict[str, Optional[float]]:
    keys = (
        "pe",
        "pb",
        "ev_ebitda",
        "dividend_yield",
        "roe",
        "roa",
        "roic",
        "net_margin",
        "ebitda_margin",
        "debt_equity",
        "current_ratio",
        "revenue_growth",
        "earnings_growth",
    )
    if not ind:
        return {k: None for k in keys}
    return {k: getattr(ind, k, None) for k in keys}


def collect_universe(db: Session, selic: float | None = None, ipca: float | None = None) -> list[dict]:
    stocks = db.query(Stock).filter(Stock.is_active.is_(True)).all()
    inds = {r.stock_id: r for r in db.query(Indicator).all()}
    scores = {r.stock_id: r for r in db.query(Score).all()}
    quotes = {r.stock_id: r for r in db.query(Quote).all()}
    rows = []
    for stock in stocks:
        ind = inds.get(stock.id)
        sc = scores.get(stock.id)
        q = quotes.get(stock.id)
        row = {
            "ticker": stock.ticker,
            "name": stock.name,
            "sector": stock.sector,
            "group": SECTOR_GROUP.get(stock.sector, "Index"),
            "cvm_code": stock.cvm_code or stock.ticker,
            "price": q.price if q else None,
            "change_percent": q.change_percent if q else None,
            "composite": sc.composite if sc else None,
            "band": sc.band if sc else None,
            **_ind_map(ind),
        }
        enrich_derived(row, selic, ipca)
        rows.append(row)
    return rows


def _scope_rows(universe: list[dict], sector: str) -> tuple[list[dict], str, str]:
    sector_rows = [r for r in universe if r["sector"] == sector]
    companies = {r["cvm_code"] for r in sector_rows}
    if len(companies) >= 3:
        return sector_rows, "sector", "its industry peers on the Ibovespa"
    group = SECTOR_GROUP.get(sector, "Index")
    group_rows = [r for r in universe if r["group"] == group]
    companies = {r["cvm_code"] for r in group_rows}
    if len(companies) >= 3:
        return group_rows, "group", f"similar {group.lower()} businesses on the Ibovespa"
    return universe, "index", "the whole Ibovespa"


def industry_medians(rows: list[dict], sector: str, selic: float | None = None, ipca: float | None = None) -> dict[str, Any]:
    for r in rows:
        enrich_derived(r, selic, ipca)
    scoped, scope, label = _scope_rows(rows, sector)
    # quality metrics: one per company
    by_cvm: dict[str, dict] = {}
    for r in scoped:
        by_cvm[r["cvm_code"]] = r
    unique = list(by_cvm.values())
    med: dict[str, Optional[float]] = {}
    for spec in METRIC_SPECS:
        if not spec.get("peer", True):
            med[spec["key"]] = None
            continue
        sample = unique if spec["kind"] != "value" else scoped
        m = _median([r.get(spec["key"]) for r in sample])  # type: ignore[arg-type]
        if m is None:
            med[spec["key"]] = None
        elif spec["unit"] == "%":
            med[spec["key"]] = round(m, 4)
        else:
            med[spec["key"]] = round(m, 2)
    return {
        "scope": scope,
        "label": label,
        "peer_count": max(0, len(unique) - 1),
        "medians": med,
        "rows": scoped,
    }


def _verdict(value: Optional[float], industry: Optional[float], higher_better: bool) -> tuple[str, str, Optional[float]]:
    if value is None or industry is None or industry == 0:
        return "na", "Not enough industry data", None
    delta = (value - industry) / abs(industry)
    good = delta >= 0.12 if higher_better else delta <= -0.12
    bad = delta <= -0.12 if higher_better else delta >= 0.12
    if good:
        tag = "strong" if higher_better else "cheap"
        label = "Better than peers" if higher_better else "Cheaper than peers"
    elif bad:
        tag = "weak" if higher_better else "expensive"
        label = "Weaker than peers" if higher_better else "Richer than peers"
    else:
        tag, label = "inline", "In line with peers"
    return tag, label, delta


def _fmt_num(value: Optional[float], unit: str) -> str:
    if value is None:
        return "—"
    if unit == "%":
        return f"{value * 100:.1f}%"
    if unit == "pp":
        return f"{value * 100:+.1f} pp"
    if unit == "R$":
        return f"R$ {value:.2f}"
    if unit == "x":
        return f"{value:.1f}x"
    return f"{value:.1f}"


def _explain(spec: dict, value: Optional[float], industry: Optional[float], tag: str) -> str:
    v = _fmt_num(value, spec["unit"])
    i = _fmt_num(industry, spec["unit"])
    if tag == "na" or not spec.get("peer", True):
        if spec["key"] == "lpa":
            return f"Profit per share is {v}. This is a fact about this stock, not a peer multiple."
        if spec["key"] == "vpa":
            return f"Book value per share is {v}. Price / book is the price divided by this."
        if spec["key"] == "graham":
            return f"The Graham textbook shortcut is {v}. Compare it with the last price — a study aid, not a target."
        return f"{spec['plain']}. We do not have a clean industry read yet."
    if spec["key"] == "pe":
        if tag == "cheap":
            return f"You pay {v} of yearly profit here versus {i} for peers. The stock is cheaper — that can be a bargain or a warning that profits may fall."
        if tag == "expensive":
            return f"You pay {v} of yearly profit here versus {i} for peers. The market is asking a premium. That is only fine if growth or quality is clearly better."
        return f"You pay {v} of yearly profit, close to the peer typical {i}."
    if spec["key"] == "pb":
        if tag == "cheap":
            return f"The price is {v} of book value versus {i} for peers — a discount to what similar firms fetch."
        if tag == "expensive":
            return f"The price is {v} of book value versus {i} for peers. Investors are paying up for the franchise."
        return f"Book multiple {v} sits near the peer {i}."
    if spec["key"] == "roe":
        if tag == "strong":
            return f"The company earned {v} on its equity. Peers earned about {i}. This is a more profitable business."
        if tag == "weak":
            return f"The company earned {v} on its equity versus about {i} for peers. Returns look softer than the neighborhood."
        return f"Return on equity {v} is close to the peer {i}."
    if spec["key"] == "dividend_yield":
        if tag == "strong":
            return f"The dividend is {v} of the price versus {i} for peers. You are being paid more to wait — check that cash can support it."
        if tag == "weak":
            return f"The dividend is {v} versus {i} for peers. This name is not the income play in the group."
        return f"Yield {v} is near the peer {i}."
    if spec["key"] == "debt_equity":
        if tag == "cheap" or tag == "strong":
            return f"Leverage is {v} versus {i} for peers — a lighter balance sheet."
        if tag == "expensive" or tag == "weak":
            return f"Leverage is {v} versus {i} for peers. More debt means less room if the cycle turns."
        return f"Leverage {v} is similar to peers at {i}."
    if spec["higher_better"]:
        if tag == "strong":
            return f"{spec['label']} is {v} versus {i} for peers — ahead of the group."
        if tag == "weak":
            return f"{spec['label']} is {v} versus {i} for peers — behind the group."
        return f"{spec['label']} {v} is close to the peer {i}."
    if tag == "cheap":
        return f"{spec['label']} is {v} versus {i} for peers — lower (usually friendlier) than the group."
    if tag == "expensive":
        return f"{spec['label']} is {v} versus {i} for peers — higher than the group."
    return f"{spec['label']} {v} is close to the peer {i}."


def _stmt_value(rows: list[FinancialStatement], period: str, account: str) -> Optional[float]:
    for r in rows:
        if r.period == period and r.account == account and r.value is not None:
            return r.value
    return None


def _annual(rows: list[FinancialStatement]) -> list[str]:
    years = sorted({r.period for r in rows if r.period and r.period.isdigit() and len(r.period) == 4})
    return years


def statement_trends(db: Session, stock: Stock) -> tuple[list[dict], Optional[float], str]:
    rows = (
        db.query(FinancialStatement)
        .filter(FinancialStatement.stock_id == stock.id, FinancialStatement.source == "cvm")
        .all()
    )
    years = _annual(rows)
    trends = []
    for y in years[-3:]:
        rev = _stmt_value(rows, y, "NetRevenue")
        ni = _stmt_value(rows, y, "NetIncome")
        ocf = _stmt_value(rows, y, "OperatingCF")
        eq = _stmt_value(rows, y, "Equity")
        trends.append(
            {
                "period": y,
                "revenue": rev,
                "net_income": ni,
                "operating_cf": ocf,
                "equity": eq,
                "margin": (ni / rev) if ni is not None and rev else None,
            }
        )
    cash = None
    note = "CVM annual filings are not loaded for this name yet."
    if trends:
        last = trends[-1]
        if last.get("net_income") and last.get("operating_cf") is not None and last["net_income"]:
            cash = last["operating_cf"] / last["net_income"]
        if len(trends) >= 2:
            a, b = trends[-2], trends[-1]
            bits = []
            if a.get("revenue") and b.get("revenue"):
                chg = b["revenue"] / a["revenue"] - 1
                bits.append("sales " + ("rose" if chg >= 0.03 else "fell" if chg <= -0.03 else "were roughly flat"))
            if a.get("net_income") and b.get("net_income"):
                chg = b["net_income"] / a["net_income"] - 1
                bits.append("profit " + ("rose" if chg >= 0.03 else "fell" if chg <= -0.03 else "was roughly flat"))
            note = ("Last two reported years: " + " and ".join(bits) + ".") if bits else "Two years of filings are on file."
        else:
            note = f"Latest CVM year on file is {trends[-1]['period']}."
    return trends, cash, note


def build_metrics(stock_row: dict, medians: dict[str, Optional[float]]) -> list[dict]:
    enrich_derived(stock_row)
    out = []
    for spec in METRIC_SPECS:
        if stock_row["sector"] in spec["skip_sectors"]:
            continue
        peer = spec.get("peer", True)
        value = stock_row.get(spec["key"])
        industry = medians.get(spec["key"]) if peer else None
        if peer:
            tag, label, delta = _verdict(value, industry, spec["higher_better"])
        else:
            tag, label, delta = "na", "Per-share fact", None
        out.append(
            {
                "key": spec["key"],
                "label": spec["label"],
                "plain": spec["plain"],
                "unit": spec["unit"],
                "value": value,
                "industry": industry,
                "delta_pct": None if delta is None else round(delta * 100, 1),
                "verdict": tag,
                "verdict_label": label,
                "explain": _explain(spec, value, industry, tag),
                "higher_better": spec["higher_better"],
                "kind": spec["kind"],
                "peer": peer,
            }
        )
    return out


def _implied(stock_row: dict, medians: dict[str, Optional[float]]) -> dict:
    price = stock_row.get("price")
    pe = stock_row.get("pe")
    pb = stock_row.get("pb")
    sector_pe = medians.get("pe")
    sector_pb = medians.get("pb")
    at_pe = round(price * (sector_pe / pe), 2) if price and pe and sector_pe and pe > 0 else None
    at_pb = round(price * (sector_pb / pb), 2) if price and pb and sector_pb and pb > 0 else None
    bank = stock_row["sector"] in BANK_LIKE
    method_price = at_pb if bank and at_pb else at_pe
    method = "industry P/VP" if bank and at_pb else "industry P/L"
    upside = ((method_price / price) - 1) * 100 if method_price and price else None
    caveat = SECTOR_CAVEATS.get(stock_row["sector"], "Industry multiples are a snapshot, not a target.")
    return {
        "price": price,
        "industry_pe": sector_pe,
        "industry_pb": sector_pb,
        "at_industry_pe": None if bank else at_pe,
        "at_industry_pb": at_pb,
        "method": method,
        "fairish": method_price,
        "upside_pct": None if upside is None else round(upside, 1),
        "caveat": caveat,
        "explain": (
            f"If this stock traded at the typical {method} of its group, the price would be around "
            f"R$ {method_price:.2f} instead of R$ {price:.2f}."
            if method_price and price
            else "Not enough price and multiple data to translate the gap into reais."
        ),
    }


def _stance(metrics: list[dict], cash: Optional[float], score: Optional[float]) -> tuple[str, str]:
    cheap = sum(1 for m in metrics if m["verdict"] == "cheap")
    expensive = sum(1 for m in metrics if m["verdict"] == "expensive")
    strong = sum(1 for m in metrics if m["verdict"] == "strong")
    weak = sum(1 for m in metrics if m["verdict"] == "weak")
    pe = next((m for m in metrics if m["key"] == "pe"), None)
    roe = next((m for m in metrics if m["key"] == "roe"), None)
    value_ok = pe and pe["verdict"] in {"cheap", "inline"}
    quality_ok = roe and roe["verdict"] in {"strong", "inline"}
    cash_ok = cash is None or cash >= 0.7
    if cheap + strong >= 3 and expensive + weak <= 1 and cash_ok and (score or 50) >= 60:
        return "Attractive", "Cheaper or better than its group on several checks, with profits that look real enough to study further."
    if expensive + weak >= 3 and cheap + strong <= 1:
        return "Caution", "The group already looks healthier or cheaper. You need a strong reason to stretch here."
    if (pe and pe["verdict"] == "cheap") and (roe and roe["verdict"] == "weak"):
        return "Caution", "It looks cheap, but it also earns less than peers. That mix is often a value trap, not a gift."
    if (pe and pe["verdict"] == "expensive") and quality_ok:
        return "Fair", "You pay a premium. That can be fine if the business keeps earning more than its group."
    if value_ok and quality_ok:
        return "Fair", "Price and quality sit near the group. Nothing screams bargain or danger on these numbers alone."
    if score and score >= 80:
        return "Attractive", "The desk score is high versus the rest of the index, with a reasonable industry comparison."
    if score and score < 50:
        return "Avoid", "Too many weak prints versus peers. Wait for a better price or a better business trend."
    return "Fair", "Mixed prints versus the group — use the metric table, do not trust a single number."


def _bullets(metrics: list[dict], cash: Optional[float], trend_note: str, caveat: str) -> dict:
    working, catch, watch = [], [], []
    for m in metrics:
        if m["verdict"] in {"cheap", "strong"} and len(working) < 3:
            working.append(m["explain"].split(" — ")[0] if " — " in m["explain"] else m["explain"])
        if m["verdict"] in {"expensive", "weak"} and len(catch) < 3:
            catch.append(m["explain"].split(" — ")[0] if " — " in m["explain"] else m["explain"])
    if cash is not None:
        if cash >= 1:
            working.append(f"Operating cash was {cash:.1f}x accounting profit — the earnings are showing up as cash.")
        elif cash < 0.7:
            catch.append(f"Operating cash was only {cash:.1f}x profit — the reported earnings are not fully turning into cash.")
    if not working:
        working.append("No standout edge versus peers on these snapshots.")
    if not catch:
        catch.append(caveat)
    watch.append(trend_note)
    watch.append("Re-check after the next earnings print; one year never settles an industry comparison.")
    return {"working": working[:3], "catch": catch[:3], "watch": watch[:2]}


def _checklist(metrics: list[dict], cash: Optional[float], payout: Optional[float]) -> list[dict]:
    pe = next((m for m in metrics if m["key"] == "pe"), None)
    roe = next((m for m in metrics if m["key"] == "roe"), None)
    debt = next((m for m in metrics if m["key"] == "debt_equity"), None)
    items = [
        {
            "key": "cheap",
            "label": "Is it cheaper than its industry?",
            "question": "Is it cheaper than its industry?",
            "ok": bool(pe and pe["verdict"] in {"cheap", "inline"}),
            "detail": pe["explain"] if pe else "No P/L yet.",
        },
        {
            "key": "quality",
            "label": "Does it earn more than peers?",
            "question": "Does it earn more than peers?",
            "ok": bool(roe and roe["verdict"] in {"strong", "inline"}),
            "detail": roe["explain"] if roe else "No ROE yet.",
        },
        {
            "key": "balance",
            "label": "Is the balance sheet safer than peers?",
            "question": "Is the balance sheet safer than peers?",
            "ok": bool(debt is None or debt["verdict"] in {"cheap", "inline", "strong", "na"}),
            "detail": debt["explain"] if debt else "Leverage is not the right lens for this type of company (banks/insurers).",
        },
        {
            "key": "cash",
            "label": "Do profits turn into cash?",
            "question": "Do profits turn into cash?",
            "ok": cash is None or cash >= 0.7,
            "detail": (
                f"Operating cash / profit = {cash:.2f}. Above 1 is healthy; below 0.7 needs a reason."
                if cash is not None
                else "We still need the company’s cash-flow filing to check this."
            ),
        },
        {
            "key": "dividend",
            "label": "If it pays a dividend, does it look payable?",
            "question": "If it pays a dividend, does it look payable?",
            "ok": payout is None or payout <= 1.0,
            "detail": (
                f"Dividend uses about {payout:.0%} of earnings. Above 100% means the payout is eating more than the year's profit."
                if payout is not None
                else "No clean payout read (need both yield and P/L)."
            ),
        },
    ]
    return items


def analyze_stock(db: Session, stock: Stock, selic: float | None = None, ipca: float | None = None) -> dict:
    universe = collect_universe(db, selic, ipca)
    self_row = next((r for r in universe if r["ticker"] == stock.ticker), None)
    if not self_row:
        return {"stance": "—", "metrics": [], "peers": []}
    packed = industry_medians(universe, stock.sector)
    metrics = build_metrics(self_row, packed["medians"])
    trends, cash, trend_note = statement_trends(db, stock)
    implied = _implied(self_row, packed["medians"])
    pe = self_row.get("pe")
    dy = self_row.get("dividend_yield")
    payout = (dy * pe) if dy is not None and pe and pe > 0 else None
    stance, stance_reason = _stance(metrics, cash, self_row.get("composite"))
    caveat = SECTOR_CAVEATS.get(stock.sector, "")
    peers = []
    for r in packed["rows"]:
        peers.append(
            {
                "ticker": r["ticker"],
                "name": r["name"],
                "pe": r.get("pe"),
                "pb": r.get("pb"),
                "roe": r.get("roe"),
                "dividend_yield": r.get("dividend_yield"),
                "composite": r.get("composite"),
                "is_self": r["ticker"] == stock.ticker,
            }
        )
    peers.sort(key=lambda p: (not p["is_self"], p["pe"] is None, p["pe"] or 99))
    headline = next((m["explain"] for m in metrics if m["key"] == "pe"), stance_reason)
    return {
        "stance": stance,
        "stance_reason": stance_reason,
        "headline": headline,
        "summary": f"{stock.name} is a {stock.sector} name. {stance_reason} {caveat}",
        "bullets": _bullets(metrics, cash, trend_note, caveat),
        "benchmark_scope": packed["scope"],
        "benchmark_label": packed["label"],
        "peer_count": packed["peer_count"],
        "metrics": metrics,
        "implied": implied,
        "cash": {
            "ocf_to_earnings": None if cash is None else round(cash, 2),
            "payout": None if payout is None else round(payout, 3),
        },
        "trends": trends,
        "trend_note": trend_note,
        "peers": peers,
        "checklist": _checklist(metrics, cash, payout),
        "caveat": caveat,
    }
