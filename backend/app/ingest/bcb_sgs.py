"""BCB SGS ingest — free official macro series."""
from __future__ import annotations

from datetime import date, timedelta

import httpx
from sqlalchemy.orm import Session

from app.db import MacroSeries

# Official SGS series codes
SERIES = {
    "SELIC": {"code": 432, "name": "Selic meta % a.a."},
    "CDI": {"code": 12, "name": "CDI diário %"},
    "IPCA": {"code": 433, "name": "IPCA mensal %"},
    "USD_BRL": {"code": 1, "name": "USD/BRL venda"},
    "IBC_BR": {"code": 24363, "name": "IBC-Br atividade"},
}


def fetch_sgs(series_code: int, start: date, end: date) -> list[dict]:
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_code}/dados"
        f"?formato=json&dataInicial={start.strftime('%d/%m/%Y')}&dataFinal={end.strftime('%d/%m/%Y')}"
    )
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.json()


def ingest_bcb(db: Session, days: int = 400) -> dict:
    end = date.today()
    start = end - timedelta(days=days)
    counts = {}
    for key, meta in SERIES.items():
        try:
            rows = fetch_sgs(meta["code"], start, end)
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
            d = row.get("data")
            existing = (
                db.query(MacroSeries)
                .filter(MacroSeries.code == key, MacroSeries.date == d)
                .one_or_none()
            )
            if existing:
                existing.value = val
            else:
                db.add(MacroSeries(code=key, name=meta["name"], date=d, value=val))
            n += 1
        counts[key] = n
    db.commit()
    return counts


def latest_macros(db: Session) -> list[dict]:
    out = []
    for key, meta in SERIES.items():
        row = (
            db.query(MacroSeries)
            .filter(MacroSeries.code == key)
            .order_by(MacroSeries.id.desc())
            .first()
        )
        if row:
            out.append(
                {
                    "code": key,
                    "name": meta["name"],
                    "date": row.date,
                    "value": row.value,
                }
            )
        else:
            out.append({"code": key, "name": meta["name"], "date": None, "value": None})
    return out
