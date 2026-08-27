"""CVM DFP/ITR ingest — official open-data ZIPs for listed companies.

Downloads annual DFP (and latest ITR) packs from dados.cvm.gov.br, matches
companies by CD_CVM, and stores a small set of canonical statement lines.
"""
from __future__ import annotations

import io
import zipfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.config import settings
from app.db import FinancialStatement, Stock
from app.ingest.httputil import download_file, head_ok
from app.seed_data import SEED_INDICATORS

DFP_BASE = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS"
ITR_BASE = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS"

# Prefer controladora net income, then consolidated period result, then 3.09.
NET_INCOME_RANK = {"3.11.01": 3, "3.11": 2, "3.09": 1}

NAME_FALLBACK = (
    ("petroleo brasileiro", "PETR4"),
    ("petrobras", "PETR4"),
    ("vale s.a", "VALE3"),
    ("vale s/a", "VALE3"),
    ("itau unibanco", "ITUB4"),
    ("itaú unibanco", "ITUB4"),
    ("banco do brasil", "BBAS3"),
    ("bco brasil", "BBAS3"),
    ("weg s.a", "WEGE3"),
    ("weg s/a", "WEGE3"),
    ("ambev", "ABEV3"),
    ("bradesco", "BBDC4"),
    ("b3 s.a", "B3SA3"),
    ("brasil, bolsa", "B3SA3"),
    ("localiza rent", "RENT3"),
    ("magazine luiza", "MGLU3"),
    ("suzano", "SUZB3"),
    ("prio s.a", "PRIO3"),
)

NEEDED_FILES = {
    "DRE": "income",
    "BPA": "balance",
    "BPP": "balance",
    "DFC_MI": "cashflow",
}


def fold(text: str) -> str:
    table = str.maketrans(
        "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ",
        "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC",
    )
    return (text or "").translate(table).lower()


def norm_cvm_code(value) -> Optional[int]:
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in {"nan", "none"}:
        return None
    try:
        return int(float(s))
    except ValueError:
        digits = "".join(c for c in s if c.isdigit())
        return int(digits) if digits else None


def parse_cvm_number(raw) -> Optional[float]:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.lower() in {"nan", "none", ""}:
        return None
    try:
        if "," in s and "." in s:
            # 1.234.567,89
            return float(s.replace(".", "").replace(",", "."))
        if "," in s:
            return float(s.replace(",", "."))
        return float(s)
    except ValueError:
        return None


def apply_scale(value: Optional[float], escala: str | None) -> Optional[float]:
    if value is None:
        return None
    esc = fold(escala or "")
    if "milhao" in esc or "milhão" in esc:
        return value * 1_000_000.0
    if esc.startswith("mil") or "thousand" in esc:
        return value * 1_000.0
    return value


def canonical_account(statement_type: str, cd: str, ds: str) -> Optional[str]:
    cd = (cd or "").strip()
    n = fold(ds)
    if statement_type == "income":
        if cd == "3.01":
            return "NetRevenue"
        if cd == "3.03":
            return "GrossProfit"
        if cd == "3.05":
            return "EBIT"
        if cd in NET_INCOME_RANK:
            if cd == "3.09" and "lucro" not in n and "preju" not in n:
                return None
            return "NetIncome"
        return None
    if statement_type == "balance":
        if cd == "1" and "ativo total" in n:
            return "TotalAssets"
        if cd == "1.01" and "ativo circulante" in n:
            return "CurrentAssets"
        if cd == "2.01" and "passivo circulante" in n:
            return "CurrentLiabilities"
        if cd == "2.02" and "passivo nao circulante" in n:
            return "NonCurrentLiabilities"
        if (
            "patrimonio liquido" in n
            and "nao controlad" not in n
            and cd.count(".") <= 1
        ):
            return "Equity"
        return None
    if statement_type == "cashflow":
        if cd == "6.01":
            return "OperatingCF"
        if cd == "6.02":
            return "InvestingCF"
        if cd == "6.03":
            return "FinancingCF"
    return None


def _period_from_row(row: dict, kind: str) -> str:
    end = str(row.get("DT_FIM_EXERC") or row.get("DT_REFER") or "")[:10]
    if kind == "dfp" and len(end) >= 4:
        return end[:4]
    return end or str(row.get("DT_REFER") or "")[:10]


def ticker_for_row(cd_cvm, denom: str, by_cvm: dict[int, str]) -> Optional[str]:
    code = norm_cvm_code(cd_cvm)
    if code is not None and code in by_cvm:
        return by_cvm[code]
    name = fold(denom)
    for frag, ticker in NAME_FALLBACK:
        if frag in name:
            return ticker
    return None


def statements_from_frame(
    df: pd.DataFrame,
    statement_type: str,
    kind: str,
    by_cvm: dict[int, str],
    allowed_tickers: set[str],
) -> list[dict]:
    """Turn a CVM DRE/BPA/BPP/DFC frame into canonical statement dicts."""
    if df is None or df.empty:
        return []
    cols = {c.upper(): c for c in df.columns}
    def col(*names: str) -> Optional[str]:
        for n in names:
            if n in cols:
                return cols[n]
        return None

    cd_cvm_col = col("CD_CVM")
    denom_col = col("DENOM_CIA")
    valor_col = col("VL_CONTA")
    conta_col = col("CD_CONTA")
    ds_col = col("DS_CONTA")
    if not valor_col or not conta_col:
        return []

    ordem_col = col("ORDEM_EXERC")
    escala_col = col("ESCALA_MOEDA")
    versao_col = col("VERSAO")
    dt_refer_col = col("DT_REFER")
    dt_fim_col = col("DT_FIM_EXERC")
    st_fixa_col = col("ST_CONTA_FIXA")

    work = df
    if ordem_col:
        work = work[work[ordem_col].astype(str).str.upper().str.contains("LTIMO", na=False)]
    if work.empty:
        work = df
    if st_fixa_col:
        flagged = work[work[st_fixa_col].astype(str).str.upper() == "S"]
        if not flagged.empty:
            work = flagged
    if versao_col and dt_refer_col and cd_cvm_col:
        tmp = work.copy()
        tmp["_v"] = pd.to_numeric(tmp[versao_col], errors="coerce").fillna(0)
        max_v = tmp.groupby([cd_cvm_col, dt_refer_col])["_v"].transform("max")
        work = tmp[tmp["_v"] == max_v]

    best: dict[tuple, tuple[int, dict]] = {}
    for _, row in work.iterrows():
        ticker = ticker_for_row(
            row.get(cd_cvm_col) if cd_cvm_col else None,
            str(row.get(denom_col, "") if denom_col else ""),
            by_cvm,
        )
        if not ticker or ticker not in allowed_tickers:
            continue
        account = canonical_account(
            statement_type,
            str(row.get(conta_col, "")),
            str(row.get(ds_col, "") if ds_col else ""),
        )
        if not account:
            continue
        value = apply_scale(
            parse_cvm_number(row.get(valor_col)),
            str(row.get(escala_col, "") if escala_col else ""),
        )
        if value is None:
            continue
        payload = {
            "ticker": ticker,
            "period": _period_from_row(
                {
                    "DT_FIM_EXERC": row.get(dt_fim_col) if dt_fim_col else None,
                    "DT_REFER": row.get(dt_refer_col) if dt_refer_col else None,
                },
                kind,
            ),
            "statement_type": statement_type,
            "account": account,
            "value": value,
            "source": "cvm",
            "cd_conta": str(row.get(conta_col, "")),
        }
        if not payload["period"]:
            continue
        rank = NET_INCOME_RANK.get(payload["cd_conta"], 0) if account == "NetIncome" else 1
        key = (ticker, payload["period"], statement_type, account)
        prev = best.get(key)
        if prev is None or rank >= prev[0]:
            best[key] = (rank, payload)
    return [item[1] for item in best.values()]


def _zip_url(kind: str, year: int) -> str:
    if kind == "itr":
        return f"{ITR_BASE}/itr_cia_aberta_{year}.zip"
    return f"{DFP_BASE}/dfp_cia_aberta_{year}.zip"


def _cache_path(kind: str, year: int) -> Path:
    return settings.data_dir / "cvm_cache" / f"{kind}_cia_aberta_{year}.zip"


def _cache_fresh(path: Path, max_age_days: int = 7) -> bool:
    if not path.exists() or path.stat().st_size < 10_000:
        return False
    age = datetime.utcnow() - datetime.utcfromtimestamp(path.stat().st_mtime)
    return age < timedelta(days=max_age_days)


def ensure_zip(kind: str, year: int) -> Optional[Path]:
    dest = _cache_path(kind, year)
    if _cache_fresh(dest):
        return dest
    url = _zip_url(kind, year)
    return download_file(url, dest)


def existing_years(kind: str, start: int | None = None, limit: int = 2) -> list[int]:
    year = start or date.today().year
    found: list[int] = []
    for y in range(year, year - 6, -1):
        path = _cache_path(kind, y)
        if path.exists() and path.stat().st_size > 10_000:
            found.append(y)
        elif head_ok(_zip_url(kind, y)):
            found.append(y)
        if len(found) >= limit:
            break
    return found


def _pick_csv(names: list[str], stmt: str, prefer: str) -> Optional[str]:
    stmt_l = stmt.lower()
    prefer_l = prefer.lower()
    hits = [n for n in names if n.lower().endswith(".csv") and stmt_l in n.lower()]
    preferred = [n for n in hits if prefer_l in n.lower()]
    if preferred:
        return preferred[0]
    return hits[0] if hits else None


def _read_csv_from_zip(zf: zipfile.ZipFile, name: str) -> Optional[pd.DataFrame]:
    raw = zf.read(name)
    for encoding in ("latin-1", "utf-8", "cp1252"):
        try:
            return pd.read_csv(io.BytesIO(raw), sep=";", encoding=encoding, dtype=str, low_memory=False)
        except Exception:
            continue
    return None


def parse_zip(path: Path, kind: str, by_cvm: dict[int, str], allowed: set[str]) -> list[dict]:
    rows: list[dict] = []
    with zipfile.ZipFile(path, "r") as zf:
        names = zf.namelist()
        for stmt, stype in NEEDED_FILES.items():
            csv_name = _pick_csv(names, stmt, "con")
            if not csv_name:
                continue
            df = _read_csv_from_zip(zf, csv_name)
            if df is None or df.empty:
                continue
            parsed = statements_from_frame(df, stype, kind, by_cvm, allowed)
            rows.extend(parsed)
            got = {r["ticker"] for r in parsed}
            missing = allowed - got
            if missing:
                ind_name = _pick_csv(names, stmt, "ind")
                if ind_name and ind_name != csv_name:
                    df_ind = _read_csv_from_zip(zf, ind_name)
                    if df_ind is not None:
                        rows.extend(statements_from_frame(df_ind, stype, kind, by_cvm, missing))
    return rows


def _upsert_statement(
    db: Session,
    stock: Stock,
    period: str,
    statement_type: str,
    account: str,
    value: Optional[float],
    source: str,
):
    row = (
        db.query(FinancialStatement)
        .filter(
            FinancialStatement.stock_id == stock.id,
            FinancialStatement.period == period,
            FinancialStatement.statement_type == statement_type,
            FinancialStatement.account == account,
        )
        .one_or_none()
    )
    if row:
        if source == "seed" and row.source == "cvm":
            return
        row.value = value
        row.source = source
    else:
        db.add(
            FinancialStatement(
                stock_id=stock.id,
                period=period,
                statement_type=statement_type,
                account=account,
                value=value,
                source=source,
            )
        )


def _add_derived_liabilities(rows: list[dict]) -> list[dict]:
    by_key: dict[tuple, dict] = {}
    for r in rows:
        by_key[(r["ticker"], r["period"], r["account"])] = r
    extra: list[dict] = []
    tickers_periods = {(r["ticker"], r["period"]) for r in rows}
    for ticker, period in tickers_periods:
        assets = by_key.get((ticker, period, "TotalAssets"))
        equity = by_key.get((ticker, period, "Equity"))
        if assets and equity and assets.get("value") is not None and equity.get("value") is not None:
            extra.append(
                {
                    "ticker": ticker,
                    "period": period,
                    "statement_type": "balance",
                    "account": "TotalLiabilities",
                    "value": assets["value"] - equity["value"],
                    "source": "cvm",
                    "cd_conta": "derived",
                }
            )
    return rows + extra


def seed_statements_from_indicators(db: Session, only_tickers: set[str] | None = None):
    """Illustrative lines only when a ticker has no official CVM rows."""
    for stock in db.query(Stock).all():
        if only_tickers is not None and stock.ticker not in only_tickers:
            continue
        ind = SEED_INDICATORS.get(stock.ticker, {})
        equity = 100_000_000.0
        roe = ind.get("roe") or 0.15
        net_income = equity * roe
        net_margin = ind.get("net_margin") or 0.15
        revenue = net_income / net_margin if net_margin else net_income * 5
        _upsert_statement(db, stock, "2024", "income", "NetRevenue", revenue, "seed")
        _upsert_statement(db, stock, "2024", "income", "NetIncome", net_income, "seed")
        _upsert_statement(db, stock, "2024", "balance", "Equity", equity, "seed")
        _upsert_statement(db, stock, "2024", "balance", "TotalAssets", equity * 2.2, "seed")
        _upsert_statement(db, stock, "2024", "cashflow", "OperatingCF", net_income * 1.1, "seed")
        _upsert_statement(db, stock, "2023", "income", "NetRevenue", revenue * 0.92, "seed")
        _upsert_statement(db, stock, "2023", "income", "NetIncome", net_income * 0.9, "seed")
    db.commit()


def _cvm_maps(db: Session) -> tuple[dict[int, str], dict[str, Stock], set[str]]:
    by_cvm: dict[int, str] = {}
    by_ticker: dict[str, Stock] = {}
    for stock in db.query(Stock).all():
        by_ticker[stock.ticker] = stock
        code = norm_cvm_code(stock.cvm_code)
        if code is not None:
            by_cvm[code] = stock.ticker
    return by_cvm, by_ticker, set(by_ticker)


def ingest_cvm(
    db: Session,
    year: int | None = None,
    dfp_years: list[int] | None = None,
    itr_years: list[int] | None = None,
) -> dict:
    by_cvm, by_ticker, allowed = _cvm_maps(db)
    if year is not None:
        dfp_years = [year]
    if dfp_years is None:
        dfp_years = existing_years("dfp", limit=2)
    if itr_years is None:
        itr_years = existing_years("itr", limit=1)

    stats: dict = {"dfp_years": [], "itr_years": [], "tickers": {}, "errors": []}
    parsed_rows: list[dict] = []

    for kind, years in (("dfp", dfp_years), ("itr", itr_years)):
        for y in years:
            try:
                path = ensure_zip(kind, y)
                if not path:
                    stats["errors"].append({"kind": kind, "year": y, "error": "download_failed"})
                    continue
                rows = parse_zip(path, kind, by_cvm, allowed)
                parsed_rows.extend(rows)
                stats[f"{kind}_years"].append(y)
            except Exception as exc:  # noqa: BLE001
                db.rollback()
                stats["errors"].append({"kind": kind, "year": y, "error": str(exc)})

    parsed_rows = _add_derived_liabilities(parsed_rows)
    matched_tickers: set[str] = set()
    for item in parsed_rows:
        stock = by_ticker.get(item["ticker"])
        if not stock:
            continue
        _upsert_statement(
            db,
            stock,
            item["period"],
            item["statement_type"],
            item["account"],
            item["value"],
            "cvm",
        )
        matched_tickers.add(item["ticker"])
        stats["tickers"][item["ticker"]] = stats["tickers"].get(item["ticker"], 0) + 1
    db.commit()

    copied = _copy_cvm_to_siblings(db, by_ticker, matched_tickers)
    matched_tickers |= copied
    stats["copied_listings"] = sorted(copied)

    missing = allowed - matched_tickers
    seed_only = {t for t in missing if t in SEED_INDICATORS}
    if seed_only:
        seed_statements_from_indicators(db, only_tickers=seed_only)
    stats["matched_tickers"] = sorted(matched_tickers)
    stats["seed_fallback"] = sorted(seed_only)
    stats["unmatched"] = sorted(missing - seed_only)
    stats["rows"] = len(parsed_rows)
    stats["status"] = "ok" if matched_tickers else "no_matches"
    return stats


def _copy_cvm_to_siblings(db: Session, by_ticker: dict[str, Stock], matched: set[str]) -> set[str]:
    """ON/PN lines share CVM filings — copy the matched ticker onto its twins."""
    by_code: dict[str, list[str]] = {}
    for ticker, stock in by_ticker.items():
        if stock.cvm_code:
            by_code.setdefault(str(stock.cvm_code), []).append(ticker)
    copied: set[str] = set()
    for tickers in by_code.values():
        if len(tickers) < 2:
            continue
        donor_ticker = next((t for t in tickers if t in matched), None)
        if not donor_ticker:
            continue
        donor = by_ticker[donor_ticker]
        stmts = (
            db.query(FinancialStatement)
            .filter(
                FinancialStatement.stock_id == donor.id,
                FinancialStatement.source == "cvm",
            )
            .all()
        )
        if not stmts:
            continue
        for ticker in tickers:
            if ticker == donor_ticker:
                continue
            stock = by_ticker[ticker]
            for s in stmts:
                _upsert_statement(db, stock, s.period, s.statement_type, s.account, s.value, "cvm")
            copied.add(ticker)
    if copied:
        db.commit()
    return copied
