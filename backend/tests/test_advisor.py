import unittest

from app.engine.advisor import (
    _implied,
    _median,
    _verdict,
    build_metrics,
    industry_medians,
)
from app.ingest.fundamentus import parse_fund_number, parse_resultado_html
from app.universe import IBOV_ROWS, SEED_STOCKS


FIXTURE = """
<table>
<tr>
<td><span><a href="detalhes.php?papel=PETR4">PETR4</a></span></td>
<td>44,37</td>
<td>6,20</td>
<td>1,10</td>
<td>0,900</td>
<td>12,00%</td>
<td>0,400</td>
<td>2,00</td>
<td>3,00</td>
<td>1,00</td>
<td>3,50</td>
<td>3,40</td>
<td>40,00%</td>
<td>35,00%</td>
<td>22,00%</td>
<td>1,20</td>
<td>18,00%</td>
<td>28,00%</td>
<td>1.000.000,00</td>
<td>100.000.000,00</td>
<td>0,70</td>
<td>5,00%</td>
</tr>
<tr>
<td><span><a href="detalhes.php?papel=ITUB4">ITUB4</a></span></td>
<td>39,00</td>
<td>9,00</td>
<td>2,00</td>
<td>0,500</td>
<td>7,00%</td>
<td>0,200</td>
<td>1,00</td>
<td>4,00</td>
<td>1,00</td>
<td>0,00</td>
<td>0,00</td>
<td>0,00%</td>
<td>0,00%</td>
<td>0,00%</td>
<td>0,00</td>
<td>0,00%</td>
<td>20,00%</td>
<td>0,00</td>
<td>1.000.000,00</td>
<td>0,00</td>
<td>10,00%</td>
</tr>
</table>
"""


def _row(ticker, sector, cvm, **vals):
    base = {
        "ticker": ticker,
        "name": ticker,
        "sector": sector,
        "group": "Energy" if sector == "Oil & Gas" else "Financials" if sector == "Banks" else "Index",
        "cvm_code": cvm,
        "price": 40.0,
        "pe": None,
        "pb": None,
        "ev_ebitda": None,
        "dividend_yield": None,
        "roe": None,
        "roic": None,
        "net_margin": None,
        "revenue_growth": None,
        "earnings_growth": None,
        "debt_equity": None,
        "current_ratio": None,
        "composite": 70,
        "band": "Fair",
        "change_percent": 0,
    }
    base.update(vals)
    return base


class UniverseTest(unittest.TestCase):
    def test_ibovespa_has_the_full_index(self):
        tickers = [t for t, *_ in IBOV_ROWS]
        self.assertGreaterEqual(len(SEED_STOCKS), 79)
        self.assertEqual(len(tickers), len(set(tickers)))
        for needed in ("PETR4", "PETR3", "VALE3", "ITUB4", "WEGE3", "AXIA3", "TEND3"):
            self.assertIn(needed, tickers)


class AdvisorMathTest(unittest.TestCase):
    def test_median_needs_two_values(self):
        self.assertIsNone(_median([6.2]))
        self.assertEqual(_median([6.0, 8.0]), 7.0)

    def test_cheap_pe_versus_industry(self):
        tag, label, delta = _verdict(6.2, 10.0, higher_better=False)
        self.assertEqual(tag, "cheap")
        self.assertIn("Cheaper", label)
        self.assertLess(delta, 0)

    def test_expensive_pe_versus_industry(self):
        tag, _, _ = _verdict(18.0, 10.0, higher_better=False)
        self.assertEqual(tag, "expensive")

    def test_strong_roe(self):
        tag, _, _ = _verdict(0.28, 0.18, higher_better=True)
        self.assertEqual(tag, "strong")

    def test_implied_price_at_industry_pe(self):
        stock = _row("PETR4", "Oil & Gas", "9512", price=40.0, pe=5.0)
        out = _implied(stock, {"pe": 10.0, "pb": 1.0})
        self.assertEqual(out["fairish"], 80.0)
        self.assertEqual(out["upside_pct"], 100.0)
        self.assertEqual(out["method"], "industry P/L")

    def test_banks_use_price_to_book(self):
        stock = _row("ITUB4", "Banks", "19348", price=40.0, pe=8.0, pb=1.0)
        out = _implied(stock, {"pe": 9.0, "pb": 2.0})
        self.assertEqual(out["fairish"], 80.0)
        self.assertEqual(out["method"], "industry P/VP")

    def test_derived_payout_and_earnings_yield(self):
        from app.engine.advisor import enrich_derived

        row = _row(
            "TAEE11",
            "Utilities",
            "20257",
            price=38.73,
            pe=8.25,
            pb=1.66,
            dividend_yield=0.0772,
            ev_ebitda=9.45,
            ebitda_margin=0.59,
            roe=0.207,
            roa=0.07,
        )
        enrich_derived(row, selic=14.0, ipca=4.5)
        self.assertAlmostEqual(row["payout"], 0.0772 * 8.25, places=4)
        self.assertAlmostEqual(row["earnings_yield"], 1 / 8.25, places=4)
        self.assertAlmostEqual(row["lpa"], 38.73 / 8.25, places=3)
        self.assertAlmostEqual(row["vpa"], 38.73 / 1.66, places=2)
        self.assertLess(row["earnings_vs_selic"], 0)
        self.assertIn("graham", row)
        self.assertAlmostEqual(row["ebitda_yield"], 1 / 9.45, places=3)
        self.assertGreater(row["financial_leverage"], 1)

    def test_scope_falls_back_when_sector_is_thin(self):
        universe = [
            _row("SMFT3", "Fitness", "1", pe=20.0, roe=0.10),
            _row("LREN3", "Retail", "2", pe=12.0, roe=0.12),
            _row("MGLU3", "Retail", "3", pe=10.0, roe=0.04),
            _row("PETR4", "Oil & Gas", "4", pe=6.0, roe=0.25),
        ]
        packed = industry_medians(universe, "Fitness")
        self.assertIn(packed["scope"], {"group", "index"})
        self.assertIsNotNone(packed["medians"]["pe"])

    def test_oil_uses_sector_when_three_companies(self):
        universe = [
            _row("PETR4", "Oil & Gas", "9512", pe=6.0, roe=0.25),
            _row("PETR3", "Oil & Gas", "9512", pe=6.2, roe=0.25),
            _row("PRIO3", "Oil & Gas", "22187", pe=10.0, roe=0.18),
            _row("BRAV3", "Oil & Gas", "25291", pe=8.0, roe=0.12),
            _row("ITUB4", "Banks", "19348", pe=9.0, roe=0.20),
        ]
        packed = industry_medians(universe, "Oil & Gas")
        self.assertEqual(packed["scope"], "sector")
        self.assertAlmostEqual(packed["medians"]["pe"], 7.1)
        metrics = build_metrics(universe[0], packed["medians"])
        pe = next(m for m in metrics if m["key"] == "pe")
        self.assertEqual(pe["verdict"], "cheap")
        self.assertNotIn("ev_ebitda", [m["key"] for m in build_metrics(universe[4], packed["medians"])])


class FundamentusParseTest(unittest.TestCase):
    def test_parse_numbers(self):
        self.assertEqual(parse_fund_number("44,37"), 44.37)
        self.assertAlmostEqual(parse_fund_number("12,00%", percent=True), 0.12)
        self.assertEqual(parse_fund_number("1.593.540.000,00"), 1593540000.0)

    def test_parse_table_and_zero_junk(self):
        table = parse_resultado_html(FIXTURE)
        self.assertEqual(table["PETR4"]["pe"], 6.2)
        self.assertAlmostEqual(table["PETR4"]["roe"], 0.28)
        self.assertEqual(table["PETR4"]["price"], 44.37)
        self.assertIsNone(table["ITUB4"]["ev_ebitda"])
        self.assertAlmostEqual(table["ITUB4"]["roe"], 0.20)


if __name__ == "__main__":
    unittest.main()
