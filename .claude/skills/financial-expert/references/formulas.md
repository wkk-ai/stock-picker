# Formulas used by the app

All per-share values use the latest 12 months (TTM) unless noted. EV = market cap + total debt − cash.

| Metric | Formula | Cheaper when | Notes |
|---|---|---|---|
| P/E (P/L) | price ÷ EPS | lower, > 0 | undefined if EPS ≤ 0 |
| Earnings yield | EPS ÷ price | higher | compare with risk-free yield |
| P/B (P/VP) | price ÷ book value per share | lower, > 0 | undefined if equity ≤ 0 |
| P/S (PSR) | market cap ÷ revenue | lower | useful for loss-making firms |
| EV/EBITDA | EV ÷ EBITDA | lower, > 0 | not for banks |
| EV/EBIT | EV ÷ EBIT | lower, > 0 | Greenblatt earnings yield = EBIT/EV |
| P/FCF | market cap ÷ (CFO − capex) | lower, > 0 | |
| Dividend yield | dividends per share (12m) ÷ price | higher | cap outliers > 15% |
| ROE | net income ÷ avg equity | higher | DuPont: margin × asset turnover × leverage |
| ROIC | NOPAT ÷ invested capital; NOPAT = EBIT × (1 − tax) | higher | McKinsey; value created when ROIC > WACC |
| ROA | net income ÷ total assets | higher | |
| Net margin | net income ÷ revenue | higher | |
| EBIT margin | EBIT ÷ revenue | higher | |
| Net debt/EBITDA | (debt − cash) ÷ EBITDA | lower | non-financials |
| Debt/equity | gross debt ÷ equity | lower | |
| Current ratio | current assets ÷ current liabilities | higher (≥ 1.5-2) | |
| Interest coverage | EBIT ÷ interest expense | higher (≥ 3) | |
| Graham number | √(22.5 × EPS × BVPS) | price below it | only EPS > 0 and BVPS > 0 |
| Bazin ceiling | DPS (12m) ÷ 0.06 | price below it | dividend payers only |
| Gordon / DDM | P0 = D1 ÷ (k − g) | | k > g required |
| CAPM | k = rf + β × (ERP) (+ country risk for BR) | | |
| WACC | E/V × ke + D/V × kd × (1 − t) | | |
| Upside | fair value ÷ price − 1 | | display only |

## Percentile scoring
For metric m in sector s: pct = rank of the stock's m among valid values in s, scaled 0-100, direction so that cheaper/better = 100. Sector with < 5 valid stocks: use whole-market ranking. Missing metric: weight redistributed among available metrics.
