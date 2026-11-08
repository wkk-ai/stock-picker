"""Multi-year fundamentals from official filings. Runs weekly; output is committed to the repo.

Brazil: CVM open data, DFP annual statements (consolidated), mapped to B3 tickers through the FCA register.
US: SEC XBRL "frames" API (one request per concept per year for all filers), mapped to tickers by CIK.

Output: pipeline/data/fundamentals.json
  {"generated_at": ..., "BR": {ticker: {year: {field: value}}}, "US": {...}}
Fields (all in currency units, annual): rev, ebit, ni, int_exp (positive number), cfo, div (paid, positive),
ca, cl (current assets/liabilities), eq (equity), ltd (long-term debt), eps (US only).

Usage: python -m pipeline.history [--years 12] [--skip-br] [--skip-us]
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import re
import sys
import time
import unicodedata
import zipfile
from pathlib import Path

import requests

OUT = Path(__file__).resolve().parent / "data" / "fundamentals.json"
CVM = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC"
SEC_UA = {"User-Agent": "stock-picker research (github.com/wkk-ai/stock-picker) contact: noreply@github.com", "Accept-Encoding": "gzip, deflate"}
BROWSER_UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"}


def fold(s: str) -> str:
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()


def get(url: str, headers: dict, tries: int = 4, timeout: int = 120) -> requests.Response | None:
    for i in range(tries):
        try:
            r = requests.get(url, headers=headers, timeout=timeout)
            if r.status_code == 200:
                return r
            if r.status_code == 404:
                return None
            print(f"  {r.status_code} {url}", file=sys.stderr)
        except requests.RequestException as e:
            print(f"  error {url}: {e}", file=sys.stderr)
        time.sleep(3 * (i + 1))
    return None


# ----------------------------------------------------------------------------- Brazil (CVM)

def _num(v: str) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def br_ticker_map(year: int) -> dict[str, list[str]]:
    """CNPJ -> list of tickers, from the FCA securities file (latest year available)."""
    for y in range(year, year - 3, -1):
        r = get(f"{CVM}/FCA/DADOS/fca_cia_aberta_{y}.zip", BROWSER_UA)
        if not r:
            continue
        z = zipfile.ZipFile(io.BytesIO(r.content))
        name = next((n for n in z.namelist() if "valor_mobiliario" in n), None)
        if not name:
            continue
        out: dict[str, set] = {}
        with z.open(name) as f:
            for row in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";"):
                tk = (row.get("Codigo_Negociacao") or "").strip().upper()
                cnpj = (row.get("CNPJ_Companhia") or "").strip()
                if re.fullmatch(r"[A-Z0-9]{4}\d{1,2}", tk) and cnpj:
                    out.setdefault(cnpj, set()).add(tk)
        print(f"FCA {y}: {sum(len(v) for v in out.values())} tickers, {len(out)} companies")
        return {k: sorted(v) for k, v in out.items()}
    return {}


def _rows(z: zipfile.ZipFile, kind: str):
    """Latest version, current fiscal year rows of a consolidated statement file."""
    name = next((n for n in z.namelist() if f"_{kind}_con_" in n), None)
    if not name:
        return
    best: dict[str, str] = {}
    rows = []
    with z.open(name) as f:
        for row in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";"):
            if fold(row.get("ORDEM_EXERC", "")).startswith("ultimo"):
                rows.append(row)
                c = row["CNPJ_CIA"]
                if row.get("VERSAO", "0") > best.get(c, ""):
                    best[c] = row.get("VERSAO", "0")
    for row in rows:
        if row.get("VERSAO", "0") == best[row["CNPJ_CIA"]]:
            yield row


def br_year(year: int) -> dict[str, dict]:
    r = get(f"{CVM}/DFP/DADOS/dfp_cia_aberta_{year}.zip", BROWSER_UA, timeout=300)
    if not r:
        print(f"DFP {year}: not available")
        return {}
    z = zipfile.ZipFile(io.BytesIO(r.content))
    data: dict[str, dict] = {}

    def put(cnpj, key, val, scale):
        if val is None:
            return
        data.setdefault(cnpj, {})[key] = val * scale

    def add(cnpj, key, val, scale):
        if val is None:
            return
        d = data.setdefault(cnpj, {})
        d[key] = d.get(key, 0.0) + val * scale

    for kind in ("DRE", "BPA", "BPP", "DFC_MI", "DFC_MD"):
        for row in _rows(z, kind):
            cnpj, code, ds = row["CNPJ_CIA"], row["CD_CONTA"], fold(row.get("DS_CONTA", ""))
            scale = 1000.0 if fold(row.get("ESCALA_MOEDA", "")) == "mil" else 1.0
            v = _num(row.get("VL_CONTA"))
            if kind == "DRE":
                if code == "3.01":
                    put(cnpj, "rev", v, scale)
                elif code == "3.05" and "antes do resultado financeiro" in ds:
                    put(cnpj, "ebit", v, scale)
                elif code == "3.06.02" and "despesa" in ds:
                    put(cnpj, "int_exp", abs(v) if v is not None else None, scale)
                elif code == "3.11" and "lucro" in ds:
                    put(cnpj, "ni", v, scale)
                elif code == "3.09" and "lucro" in ds and "ni" not in data.get(cnpj, {}):
                    put(cnpj, "ni_alt", v, scale)
            elif kind == "BPA" and code == "1.01":
                put(cnpj, "ca", v, scale)
            elif kind == "BPP":
                if code == "2.01":
                    put(cnpj, "cl", v, scale)
                elif code == "2.03":
                    put(cnpj, "eq", v, scale)
                elif code == "2.02.01" and "emprestimo" in ds:
                    put(cnpj, "ltd", v, scale)
            elif kind.startswith("DFC"):
                if code == "6.01":
                    put(cnpj, "cfo", v, scale)
                elif code.startswith("6.03.") and code.count(".") == 2 and re.search(r"dividend|juros sobre (o )?capital|jcp", ds):
                    if v is not None and v < 0:
                        add(cnpj, "div", abs(v), scale)
    for d in data.values():
        if "ni" not in d and "ni_alt" in d:
            d["ni"] = d["ni_alt"]
        d.pop("ni_alt", None)
    print(f"DFP {year}: {len(data)} companies")
    return data


def build_br(years: list[int]) -> dict:
    tmap = br_ticker_map(years[-1] + 1)
    out: dict[str, dict] = {}
    for y in years:
        for cnpj, vals in br_year(y).items():
            for tk in tmap.get(cnpj, []):
                out.setdefault(tk, {})[str(y)] = {k: round(v, 2) for k, v in vals.items()}
    return out


# ----------------------------------------------------------------------------- US (SEC frames)

DURATION = {
    "rev": ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"],
    "ebit": ["OperatingIncomeLoss"],
    "ni": ["NetIncomeLoss"],
    "int_exp": ["InterestExpense", "InterestExpenseNonoperating", "InterestExpenseDebt"],
    "cfo": ["NetCashProvidedByUsedInOperatingActivities"],
    "div": ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"],
}
INSTANT = {
    "ca": ["AssetsCurrent"],
    "cl": ["LiabilitiesCurrent"],
    "eq": ["StockholdersEquity"],
    "ltd": ["LongTermDebtNoncurrent", "LongTermDebt"],
}


def _frame(concept: str, period: str, unit: str = "USD") -> dict[int, float]:
    r = get(f"https://data.sec.gov/api/xbrl/frames/us-gaap/{concept}/{unit}/{period}.json", SEC_UA)
    time.sleep(0.15)  # SEC fair-access: max 10 requests/second
    if not r:
        return {}
    return {int(d["cik"]): float(d["val"]) for d in r.json().get("data", [])}


def build_us(years: list[int]) -> dict:
    r = get("https://www.sec.gov/files/company_tickers.json", SEC_UA)
    if not r:
        print("SEC ticker map unavailable", file=sys.stderr)
        return {}
    cik_tk: dict[int, str] = {}
    for d in r.json().values():
        cik_tk.setdefault(int(d["cik_str"]), d["ticker"].replace("-", ".").upper())
    out: dict[str, dict] = {}

    def store(vals: dict[int, float], year: int, key: str, absval: bool = False):
        for cik, v in vals.items():
            tk = cik_tk.get(cik)
            if not tk:
                continue
            row = out.setdefault(tk, {}).setdefault(str(year), {})
            if key not in row:  # first concept in the list wins
                row[key] = round(abs(v) if absval else v, 2)

    for y in years:
        for key, concepts in DURATION.items():
            for c in concepts:
                store(_frame(c, f"CY{y}"), y, key, absval=key in ("int_exp", "div"))
        for key, concepts in INSTANT.items():
            for c in concepts:
                store(_frame(c, f"CY{y}Q4I"), y, key)
        store(_frame("EarningsPerShareDiluted", f"CY{y}", "USD-per-shares"), y, "eps")
        print(f"SEC {y}: {sum(1 for t in out.values() if str(y) in t)} tickers")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=int, default=12)
    ap.add_argument("--skip-br", action="store_true")
    ap.add_argument("--skip-us", action="store_true")
    a = ap.parse_args()
    this_year = dt.date.today().year
    years = list(range(this_year - a.years, this_year))  # last complete fiscal years

    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    res = {"generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "years": [str(y) for y in years]}
    res["BR"] = old.get("BR", {}) if a.skip_br else build_br(years)
    res["US"] = old.get("US", {}) if a.skip_us else build_us(years)
    for m in ("BR", "US"):
        n = len(res[m])
        if n == 0 and old.get(m):
            print(f"{m}: empty result, keeping previous data", file=sys.stderr)
            res[m] = old[m]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(res, separators=(",", ":"), sort_keys=True))
    print(f"wrote {OUT} BR={len(res['BR'])} US={len(res['US'])} ({OUT.stat().st_size / 1e6:.1f} MB)")
    for tk in ("PETR4", "WEGE3", "ITUB4", "AAPL", "JPM"):
        m = "BR" if tk[-1].isdigit() else "US"
        h = res[m].get(tk, {})
        last = max(h) if h else None
        print(" check", tk, last, h.get(last) if last else None)


if __name__ == "__main__":
    main()
