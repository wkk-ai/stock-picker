"""CVM DFP/ITR ingest — downloads open data ZIPs and extracts key accounts.

Full CVM dumps are large. For MVP we:
1. Try to fetch the latest annual DFP ZIP for configured years
2. Parse CSVs for seeded tickers' company names / selected accounts when present
3. Always ensure synthetic statement rows exist from seed indicators so UI works offline
"""
from __future__ import annotations

import io
import zipfile
from pathlib import Path
from typing import Optional

import httpx
import pandas as pd
from sqlalchemy.orm import Session

from app.config import settings
from app.db import FinancialStatement, Stock
from app.seed_data import SEED_INDICATORS

DFP_BASE = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS"


def _download_zip(year: int) -> Optional[Path]:
    cache = settings.data_dir / "cvm_cache" / f"dfp_cia_aberta_{year}.zip"
    if cache.exists() and cache.stat().st_size > 1000:
        return cache
    url = f"{DFP_BASE}/dfp_cia_aberta_{year}.zip"
    try:
        with httpx.Client(timeout=120.0, follow_redirects=True) as client:
            r = client.get(url)
            if r.status_code != 200:
                return None
            cache.write_bytes(r.content)
            return cache
    except Exception:
        return None


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


def seed_statements_from_indicators(db: Session):
    """Derive illustrative statement lines from known ratios for UI/demo."""
    for stock in db.query(Stock).all():
        ind = SEED_INDICATORS.get(stock.ticker, {})
        # Fake revenue/equity units so charts have something — marked source=seed
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


# Map CVM company name fragments → ticker (safer than fuzzy first-word match)
CVM_NAME_MAP = {
    "petrobras": "PETR4",
    "vale s.a": "VALE3",
    "vale s/a": "VALE3",
    "itau unibanco": "ITUB4",
    "itaú unibanco": "ITUB4",
    "banco do brasil": "BBAS3",
    "weg s.a": "WEGE3",
    "weg s/a": "WEGE3",
    "ambev": "ABEV3",
    "bradesco": "BBDC4",
    "b3 s.a": "B3SA3",
    "localiza": "RENT3",
    "magazine luiza": "MGLU3",
    "suzano": "SUZB3",
    "petro rio": "PRIO3",
    "prio": "PRIO3",
}


def try_parse_cvm_zip(db: Session, year: int = 2024) -> dict:
    path = _download_zip(year)
    if not path:
        return {"status": "skipped", "reason": "download_failed", "year": year}

    matched = 0
    seen: set[tuple] = set()
    try:
        with zipfile.ZipFile(path, "r") as zf:
            names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            dre = next((n for n in names if "dre" in n.lower() and "con" in n.lower()), None)
            if not dre:
                return {"status": "downloaded", "parsed": 0, "note": "no DRE csv found", "year": year}
            with zf.open(dre) as fh:
                raw = fh.read()
            df = None
            for encoding in ("latin-1", "utf-8", "cp1252"):
                try:
                    df = pd.read_csv(io.BytesIO(raw), sep=";", encoding=encoding, dtype=str, low_memory=False)
                    break
                except Exception:
                    df = None
            if df is None or df.empty:
                return {"status": "downloaded", "parsed": 0, "note": "csv_parse_failed", "year": year}

            denom_col = None
            for c in df.columns:
                if "denom" in c.lower():
                    denom_col = c
                    break
            valor_col = next((c for c in df.columns if c.lower() in ("vl_conta", "valor")), None)
            conta_col = next((c for c in df.columns if "ds_conta" in c.lower()), None)
            if not denom_col or not valor_col:
                return {
                    "status": "downloaded",
                    "parsed": 0,
                    "note": "missing columns",
                    "columns": list(df.columns)[:20],
                }

            by_ticker = {s.ticker: s for s in db.query(Stock).all()}

            for _, row in df.iterrows():
                name = str(row.get(denom_col, "")).strip().lower()
                ticker = None
                for frag, t in CVM_NAME_MAP.items():
                    if frag in name:
                        ticker = t
                        break
                if not ticker or ticker not in by_ticker:
                    continue
                stock = by_ticker[ticker]
                account = str(row.get(conta_col, "Account"))[:80] if conta_col else "Account"
                al = account.lower()
                if not any(k in al for k in ("lucro líquido", "lucro liquido", "receita de venda", "receita operacional")):
                    continue
                raw_val = str(row.get(valor_col, "")).strip()
                try:
                    # CVM often uses 1234,56 or 1.234.567,89
                    if "," in raw_val and "." in raw_val:
                        val = float(raw_val.replace(".", "").replace(",", "."))
                    elif "," in raw_val:
                        val = float(raw_val.replace(",", "."))
                    else:
                        val = float(raw_val)
                except ValueError:
                    continue
                key = (stock.id, str(year), "income", account)
                if key in seen:
                    continue
                seen.add(key)
                _upsert_statement(db, stock, str(year), "income", account, val, "cvm")
                matched += 1
                if matched >= 80:
                    break
            db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        return {"status": "error", "error": str(exc), "year": year}

    return {"status": "ok", "matched_rows": matched, "year": year, "file": str(path)}


def ingest_cvm(db: Session, year: int = 2024) -> dict:
    seed_statements_from_indicators(db)
    try:
        cvm = try_parse_cvm_zip(db, year=year)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        cvm = {"status": "error", "error": str(exc)}
    return {"seed_statements": "ok", "cvm": cvm}
