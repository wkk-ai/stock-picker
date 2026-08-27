import unittest

import pandas as pd

from app.engine.indicators import compute_from_statements
from app.ingest.bcb_sgs import to_br_date, to_iso_date
from app.ingest.cvm_dfp_itr import (
    apply_scale,
    canonical_account,
    fold,
    norm_cvm_code,
    parse_cvm_number,
    statements_from_frame,
)


class CvmHelpersTest(unittest.TestCase):
    def test_norm_cvm_code_strips_padding(self):
        self.assertEqual(norm_cvm_code("009512"), 9512)
        self.assertEqual(norm_cvm_code("9512"), 9512)
        self.assertEqual(norm_cvm_code(1023), 1023)

    def test_parse_cvm_number(self):
        self.assertEqual(parse_cvm_number("497549000.0000000000"), 497549000.0)
        self.assertEqual(parse_cvm_number("1.234.567,89"), 1234567.89)
        self.assertEqual(parse_cvm_number("14,00"), 14.0)

    def test_apply_scale_thousands(self):
        self.assertEqual(apply_scale(417587000.0, "MIL"), 417587000000.0)

    def test_canonical_accounts(self):
        self.assertEqual(canonical_account("income", "3.01", "Receita de Venda"), "NetRevenue")
        self.assertEqual(
            canonical_account("income", "3.11.01", "Atribuído a Sócios da Empresa Controladora"),
            "NetIncome",
        )
        self.assertEqual(canonical_account("balance", "1", "Ativo Total"), "TotalAssets")
        self.assertEqual(
            canonical_account("balance", "2.03", "Patrimônio Líquido Consolidado"),
            "Equity",
        )
        self.assertEqual(
            canonical_account("balance", "2.07", "Patrimônio Líquido Consolidado"),
            "Equity",
        )
        self.assertIsNone(
            canonical_account("balance", "2.03.01", "Participação dos Acionistas Não Controladores")
        )
        self.assertEqual(
            canonical_account("cashflow", "6.01", "Caixa Líquido Atividades Operacionais"),
            "OperatingCF",
        )

    def test_statements_from_frame_maps_petrobras(self):
        df = pd.DataFrame(
            [
                {
                    "CD_CVM": "009512",
                    "DENOM_CIA": "PETROLEO BRASILEIRO S.A. PETROBRAS",
                    "ORDEM_EXERC": "ÚLTIMO",
                    "DT_REFER": "2025-12-31",
                    "DT_FIM_EXERC": "2025-12-31",
                    "VERSAO": "1",
                    "CD_CONTA": "3.01",
                    "DS_CONTA": "Receita de Venda de Bens e/ou Serviços",
                    "VL_CONTA": "497549000.0000000000",
                    "ESCALA_MOEDA": "MIL",
                    "ST_CONTA_FIXA": "S",
                },
                {
                    "CD_CVM": "009512",
                    "DENOM_CIA": "PETROLEO BRASILEIRO S.A. PETROBRAS",
                    "ORDEM_EXERC": "ÚLTIMO",
                    "DT_REFER": "2025-12-31",
                    "DT_FIM_EXERC": "2025-12-31",
                    "VERSAO": "1",
                    "CD_CONTA": "3.11.01",
                    "DS_CONTA": "Atribuído a Sócios da Empresa Controladora",
                    "VL_CONTA": "110129000.0000000000",
                    "ESCALA_MOEDA": "MIL",
                    "ST_CONTA_FIXA": "S",
                },
                {
                    "CD_CVM": "009512",
                    "DENOM_CIA": "PETROLEO BRASILEIRO S.A. PETROBRAS",
                    "ORDEM_EXERC": "PENÚLTIMO",
                    "DT_REFER": "2025-12-31",
                    "DT_FIM_EXERC": "2024-12-31",
                    "VERSAO": "1",
                    "CD_CONTA": "3.01",
                    "DS_CONTA": "Receita de Venda de Bens e/ou Serviços",
                    "VL_CONTA": "490000000.0000000000",
                    "ESCALA_MOEDA": "MIL",
                    "ST_CONTA_FIXA": "S",
                },
            ]
        )
        rows = statements_from_frame(df, "income", "dfp", {9512: "PETR4"}, {"PETR4"})
        by_period = {(r["period"], r["account"]): r["value"] for r in rows}
        self.assertEqual(by_period[("2025", "NetRevenue")], 497549000000.0)
        self.assertEqual(by_period[("2025", "NetIncome")], 110129000000.0)
        self.assertEqual(by_period[("2024", "NetRevenue")], 490000000000.0)

    def test_net_income_prefers_controladora(self):
        df = pd.DataFrame(
            [
                {
                    "CD_CVM": "009512",
                    "DENOM_CIA": "PETROBRAS",
                    "ORDEM_EXERC": "ÚLTIMO",
                    "DT_REFER": "2025-12-31",
                    "DT_FIM_EXERC": "2025-12-31",
                    "VERSAO": "1",
                    "CD_CONTA": "3.11",
                    "DS_CONTA": "Lucro/Prejuízo Consolidado do Período",
                    "VL_CONTA": "100",
                    "ESCALA_MOEDA": "UNIDADE",
                    "ST_CONTA_FIXA": "S",
                },
                {
                    "CD_CVM": "009512",
                    "DENOM_CIA": "PETROBRAS",
                    "ORDEM_EXERC": "ÚLTIMO",
                    "DT_REFER": "2025-12-31",
                    "DT_FIM_EXERC": "2025-12-31",
                    "VERSAO": "1",
                    "CD_CONTA": "3.11.01",
                    "DS_CONTA": "Atribuído a Sócios da Empresa Controladora",
                    "VL_CONTA": "90",
                    "ESCALA_MOEDA": "UNIDADE",
                    "ST_CONTA_FIXA": "S",
                },
            ]
        )
        rows = statements_from_frame(df, "income", "dfp", {9512: "PETR4"}, {"PETR4"})
        ni = [r for r in rows if r["account"] == "NetIncome"]
        self.assertEqual(len(ni), 1)
        self.assertEqual(ni[0]["value"], 90.0)

    def test_fold_handles_accents(self):
        self.assertIn("patrimonio liquido", fold("Patrimônio Líquido Consolidado"))


class BcbDateTest(unittest.TestCase):
    def test_iso_roundtrip(self):
        self.assertEqual(to_iso_date("26/08/2026"), "2026-08-26")
        self.assertEqual(to_iso_date("2026-08-26"), "2026-08-26")
        self.assertEqual(to_br_date("2026-08-26"), "26/08/2026")


class IndicatorMathTest(unittest.TestCase):
    def test_roe_from_annual_cvm_rows(self):
        class FakeStock:
            id = 1

        class FakeRow:
            def __init__(self, period, account, value):
                self.period = period
                self.account = account
                self.value = value
                self.source = "cvm"
                self.stock_id = 1

        class Query:
            def __init__(self, rows):
                self._rows = rows

            def filter(self, *a, **k):
                return self

            def all(self):
                return self._rows

        class FakeDb:
            def query(self, model):
                return Query(
                    [
                        FakeRow("2025", "NetIncome", 110.0),
                        FakeRow("2025", "Equity", 400.0),
                        FakeRow("2025", "TotalAssets", 1200.0),
                        FakeRow("2025", "NetRevenue", 500.0),
                        FakeRow("2024", "NetRevenue", 400.0),
                        FakeRow("2024", "NetIncome", 100.0),
                        FakeRow("2026-06-30", "NetIncome", 40.0),
                    ]
                )

        out = compute_from_statements(FakeDb(), FakeStock())
        self.assertAlmostEqual(out["roe"], 110 / 400)
        self.assertAlmostEqual(out["roa"], 110 / 1200)
        self.assertAlmostEqual(out["net_margin"], 110 / 500)
        self.assertAlmostEqual(out["revenue_growth"], 500 / 400 - 1)
        self.assertAlmostEqual(out["earnings_growth"], 110 / 100 - 1)


if __name__ == "__main__":
    unittest.main()
