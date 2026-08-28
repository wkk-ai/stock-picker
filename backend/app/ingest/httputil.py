"""Shared HTTP helpers for official data sources."""
from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import httpx

USER_AGENT = "StockPickerBR/0.1 (research desk; github.com/wkk-ai/stock-picker)"
DEFAULT_HEADERS = {"User-Agent": USER_AGENT, "Accept": "*/*"}


def request_json(url: str, timeout: float = 60.0, retries: int = 3) -> list | dict:
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
                r = client.get(url)
                r.raise_for_status()
                return r.json()
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            time.sleep(0.6 * (attempt + 1))
    raise last_exc or RuntimeError(f"request failed: {url}")


def head_ok(url: str, timeout: float = 8.0) -> bool:
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
            r = client.head(url)
            if r.status_code == 200:
                return True
            if r.status_code in (403, 405):
                r = client.get(url, headers={**DEFAULT_HEADERS, "Range": "bytes=0-0"})
                return r.status_code in (200, 206)
            return False
    except Exception:
        return False


def download_file(url: str, dest: Path, timeout: float = 600.0) -> Optional[Path]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".partial")
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True, headers=DEFAULT_HEADERS) as client:
            with client.stream("GET", url) as r:
                if r.status_code != 200:
                    return None
                with tmp.open("wb") as fh:
                    for chunk in r.iter_bytes():
                        fh.write(chunk)
        if tmp.stat().st_size < 1000:
            tmp.unlink(missing_ok=True)
            return None
        tmp.replace(dest)
        return dest
    except Exception:
        tmp.unlink(missing_ok=True)
        return None
