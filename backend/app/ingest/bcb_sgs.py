"""BCB SGS ingest — official Banco Central time series."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.db import MacroSeries
from app.ingest.httputil import request_json

# Official SGS series codes: https://www3.bcb.gov.br/sgspub
SERIES = {
    "SELIC": {"code": 432, "name": "Selic meta % a.a."},
    "CDI": {"code": 12, "name": "CDI diário %"},
    "IPCA": {"code": 433, "name": "IPCA mensal %"},
    "IPCA_12M": {"code": 13522, "name": "IPCA 12 meses %"},
    "USD_BRL": {"code": 1, "name": "USD/BRL venda"},
    "IBC_BR": {"code": 24363, "name": "IBC-Br atividade"},
}

SGS_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"


def to_iso_date(raw: str | None) -> str | None:
    if not raw:
        return None
    s = str(raw).strip()
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    try:
        return datetime.strptime(s[:10], "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        try:
            return datetime.strptime(s[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            return None


def to_br_date(iso: str | None) -> str | None:
    if not iso:
        return None
    parsed = to_iso_date(iso)
    if not parsed:
        return iso
    y, m, d = parsed.split("-")
    return f"{d}/{m}/{y}"


def fetch_sgs(series_code: int, start: date, end: date) -> list[dict]:
    url = (
        f"{SGS_BASE}.{series_code}/dados"
        f"?formato=json&dataInicial={start.strftime('%d/%m/%Y')}&dataFinal={end.strftime('%d/%m/%Y')}"
    )
    data = request_json(url, timeout=60.0, retries=3)
    if isinstance(data, list):
        return data
    return []


def fetch_sgs_last(series_code: int, n: int = 400) -> list[dict]:
    url = f"{SGS_BASE}.{series_code}/dados/ultimos/{n}?formato=json"
    data = request_json(url, timeout=60.0, retries=3)
    if isinstance(data, list):
        return data
    return []


def ingest_bcb(db: Session, days: int = 400) -> dict:
    end = date.today()
    start = end - timedelta(days=days)
    counts: dict[str, int | str] = {}
    for key, meta in SERIES.items():
        try:
            try:
                rows = fetch_sgs(meta["code"], start, end)
            except Exception:
                rows = fetch_sgs_last(meta["code"], n=max(days, 30))
            if not rows:
                rows = fetch_sgs_last(meta["code"], n=30)
        except Exception as exc:  # noqa: BLE001
            counts[key] = f"error:{exc}"
            continue
        n = 0
        for row in rows:
            raw = str(row.get("valor", "")).replace(",", ".")
            try:
                val = float(raw)
            except ValueError:
                continue
            iso = to_iso_date(str(row.get("data") or ""))
            if not iso:
                continue
            br = to_br_date(iso)
            existing = (
                db.query(MacroSeries)
                .filter(MacroSeries.code == key, MacroSeries.date.in_([iso, br]))
                .first()
            )
            if existing:
                existing.value = val
                existing.date = iso
                existing.name = meta["name"]
            else:
                db.add(MacroSeries(code=key, name=meta["name"], date=iso, value=val))
            n += 1
        counts[key] = n
    db.commit()
    return counts


def _date_sort_key(raw: str | None) -> str:
    return to_iso_date(raw) or ""


def latest_macros(db: Session) -> list[dict]:
    out = []
    for key, meta in SERIES.items():
        rows = db.query(MacroSeries).filter(MacroSeries.code == key).all()
        row = max(rows, key=lambda r: _date_sort_key(r.date), default=None) if rows else None
        if row:
            out.append(
                {
                    "code": key,
                    "name": meta["name"],
                    "date": to_br_date(row.date) or row.date,
                    "value": row.value,
                    "source": "BCB SGS",
                }
            )
        else:
            out.append(
                {
                    "code": key,
                    "name": meta["name"],
                    "date": None,
                    "value": None,
                    "source": "BCB SGS",
                }
            )
    return out


def macro_value(items: list[dict], code: str) -> float | None:
    for item in items:
        if item.get("code") == code and item.get("value") is not None:
            return item["value"]
    return None
