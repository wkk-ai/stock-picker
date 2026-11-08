"""Price history for the stock page chart: Yahoo Finance via yfinance, adjusted for dividends and splits.

Writes site/data/prices/<TICKER>.json = {"d": [[date, close], ...last ~2 years daily],
                                          "w": [[date, close], ...last ~10 years weekly]}
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import pandas as pd
import yfinance as yf

OUT = Path(__file__).resolve().parents[1] / "site" / "data" / "prices"


def yahoo_symbol(ticker: str, market: str) -> str:
    return f"{ticker}.SA" if market == "BR" else ticker.replace(".", "-")


def _closes(symbols: list[str], period: str, interval: str) -> pd.DataFrame:
    """Adjusted closes, one column per symbol. Downloads in chunks to stay polite."""
    frames = []
    for i in range(0, len(symbols), 100):
        chunk = symbols[i : i + 100]
        for attempt in range(3):
            try:
                df = yf.download(chunk, period=period, interval=interval, auto_adjust=True, progress=False,
                                 group_by="column", threads=True)
                close = df["Close"] if isinstance(df.columns, pd.MultiIndex) else df[["Close"]].rename(columns={"Close": chunk[0]})
                frames.append(close)
                break
            except Exception as e:  # noqa: BLE001
                print(f"  prices {interval} chunk {i}: {e}", file=sys.stderr)
                time.sleep(5 * (attempt + 1))
        time.sleep(1)
    return pd.concat(frames, axis=1) if frames else pd.DataFrame()


def _series(col: pd.Series) -> list:
    out = []
    for d, v in col.dropna().items():
        if isinstance(v, float) and (math.isnan(v) or v <= 0):
            continue
        out.append([d.strftime("%Y-%m-%d"), round(float(v), 4)])
    return out


def build(stocks: list[tuple[str, str]]) -> int:
    """stocks: [(ticker, market)]. Returns how many tickers got data."""
    OUT.mkdir(parents=True, exist_ok=True)
    sym = {yahoo_symbol(t, m): t for t, m in stocks}
    daily = _closes(list(sym), "2y", "1d")  # 2 years so the 200-day average covers the whole 1-year view
    weekly = _closes(list(sym), "10y", "1wk")
    n = 0
    for s, t in sym.items():
        d = _series(daily[s]) if s in daily else []
        w = _series(weekly[s]) if s in weekly else []
        if not d and not w:
            continue
        (OUT / f"{t}.json").write_text(json.dumps({"d": d, "w": w}, separators=(",", ":")))
        n += 1
    print(f"prices: {n} of {len(sym)} tickers")
    return n
