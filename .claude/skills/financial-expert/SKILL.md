---
name: financial-expert
description: Equity valuation and stock-screening rules distilled from William's finance library (Graham, McKinsey Valuation, Damodaran, Berk-DeMarzo, Brealey-Myers, Ross, Gitman, Rosenbaum, CFA notes, GBP/FEA material). Use when judging if a stock is cheap, building screeners or scores, or explaining indicators.
---

# Financial expert — how to judge if a stock is cheap

Use this before writing any screening rule, score, fair-value formula or explanation in the stock-picker app, or when answering valuation questions. Book-by-book source notes are in `references/sources.md`; formulas in `references/formulas.md`.

## 1. Core principles (agreed across the library)

1. **Price is not value.** A stock is cheap only relative to the cash it will generate and the risk of that cash (Graham; McKinsey ch. 1-3; Damodaran). Low multiple alone is not proof.
2. **Value comes from ROIC above cost of capital, times growth.** Growth with ROIC below WACC destroys value (McKinsey "economic profit"; Berk-DeMarzo; Brealey-Myers). So a cheap stock with ROIC < WACC is often a trap.
3. **Margin of safety.** Buy only well below a conservative estimate of intrinsic value; the gap protects against forecast error (Graham ch. 20).
4. **Compare like with like.** Multiples only mean something versus sector peers, the company's own history, and the risk-free rate (McKinsey multiples chapter; Damodaran relative valuation; Rosenbaum comps).
5. **Use normalized earnings.** Average several years (Graham: 3-year average EPS); cyclicals and commodities at peak earnings look cheap right before profits fall.
6. **Balance sheet first.** Weak liquidity or heavy debt makes "cheap" dangerous (Graham defensive criteria; Gitman/Ross ratio analysis).
7. **Behavior is the main risk.** Anchoring, herding and overconfidence drive mispricing and bad decisions (Kahneman; Munger; Graham "Mr. Market").

## 2. Indicators the app must compute (definitions)

Valuation (lower = cheaper): P/E (P/L), P/B (P/VP), P/S (PSR), EV/EBIT, EV/EBITDA, P/FCF. Yield form (higher = cheaper): earnings yield = EBIT/EV or E/P, FCF yield, dividend yield.
Quality: ROE, ROIC, ROA, gross/EBIT/net margin, revenue and EPS growth (5y), earnings stability (years with loss).
Safety: net debt/EBITDA, gross debt/equity, current ratio, interest coverage (EBIT/interest).
Liquidity: average daily traded value (B3: "liquidez 2 meses").
Exact formulas: `references/formulas.md`.

## 3. Rules of thumb with source

| Rule | Threshold | Source |
|---|---|---|
| Graham defensive P/E | P/E on 3-yr avg EPS ≤ 15 | Graham, ch. 14 |
| Graham P/B | P/B ≤ 1.5, or P/E × P/B ≤ 22.5 | Graham, ch. 14 |
| Graham number | √(22.5 × EPS × BVPS) = fair price ceiling | derived from the 22.5 rule |
| Earnings yield vs bonds | E/P ≥ yield of high-grade bonds (BR: NTN-B/Selic; US: 10y or AA) | Graham, ch. 14 |
| Earnings stability | profit in each of last 10 years | Graham, ch. 14 |
| Growth | EPS up ≥ 1/3 over 10 yrs (3-yr averages) | Graham, ch. 14 |
| Financial strength (industrial) | current ratio ≥ 2; long-term debt ≤ net working capital | Graham, ch. 14 |
| Utilities | debt ≤ 2 × book equity | Graham, ch. 14 |
| P/E bands (US, long-run) | <10 low, 10-20 moderate, >20 expensive | Zweig commentary in Graham |
| Bazin (BR dividend) | ceiling price = avg dividend per share ÷ 6% | Décio Bazin (BR market practice) |
| Magic Formula | rank by EV/EBIT (low) + ROIC (high), exclude financials and utilities | Greenblatt (market practice) |
| Leverage comfort | net debt/EBITDA < 2-3× for non-financials | Rosenbaum credit stats; IB practice |

## 4. The scoring method used by the app

1. **Universe filter**: B3 with daily liquidity ≥ R$ 200 thousand; S&P 500 members. Drop missing price.
2. **Sector-relative percentiles**: for each valuation metric, percentile rank inside the stock's sector (fallback: market) so a bank is compared with banks. Cheaper = higher percentile.
3. **Value score (0-100)** = weighted average of percentiles: EV/EBIT 25%, P/E 20%, P/B 15%, P/FCF or P/S 15%, dividend yield 10%, EV/EBITDA 15%. Banks/insurers: P/E 40%, P/B 40%, DY 20% (EV and debt are meaningless for them — Damodaran, McKinsey ch. on financial institutions).
4. **Quality score (0-100)**: ROIC (or ROE for financials) 35%, margins 20%, growth 15%, debt safety 20%, current ratio 10%, sector-relative.
5. **Final score** = 0.6 × value + 0.4 × quality, minus penalties for red flags. Value without quality is the classic value trap (McKinsey: ROIC < WACC destroys value).
6. **Fair-value references** shown, never as advice: Graham number, Bazin ceiling, and implied upside.

## 5. Red flags (penalize and show to the user)

- Negative or near-zero earnings (P/E meaningless) — exclude from P/E ranking.
- ROE > 60% with tiny equity (leverage illusion) or negative equity.
- Net debt/EBITDA > 4× (non-financials); current ratio < 1.
- Dividend yield > 15% (likely one-off or price collapse — trap risk).
- P/E < 3 (often one-off gains, asset sales, tax credits — "quality of earnings").
- Revenue shrinking over 5 years while multiples are low (structural decline).
- Cyclicals/commodities (mining, oil, steel, pulp) at peak margins: flag "earnings may be at cycle peak".
- Low liquidity: price may not be executable.

## 6. Sector special cases

- **Banks/insurers**: use P/E, P/B, ROE, DY. Ignore EV/EBITDA, net debt, current ratio, margins on revenue.
- **Utilities/regulated**: high debt is normal; judge by DY and stable ROE; Graham limit debt ≤ 2× equity.
- **Commodities/cyclicals**: prefer EV/EBIT on normalized (multi-year average) earnings; DY volatile.
- **Holdings**: discount to sum-of-parts is common; flag.
- **Growth/tech**: low P/S or EV/EBIT rare; use PEG cautiously; quality weight matters more.
- **Brazil**: higher cost of capital (Selic, country risk) means lower fair multiples than US; compare BR to BR, US to US. Inflation distorts book values and nominal growth.

## 7. Communication rules

- Always say "barata pelos indicadores", never "compre". Show the why (which metrics drove the score) and the flags.
- Show data date and source. Indicators are backward-looking.
- Educational tool, not a recommendation (CVM rules for analysts in Brazil).

## 8. Coverage honesty

The library has ~80 finance works (~50M characters). Full line-by-line reading was attempted with parallel readers and hit the plan's usage limit. This skill is built from targeted reading of the valuation, ratio and multiples sections of each work (keyword-dense passage extraction across all 62 available texts) plus the canonical frameworks those books teach. CFA 2018 curriculum box sets and Schweser L2 books were not yet readable (folder too deep to copy); formulas from them come from the Schweser quicksheets and FinQuiz formula sheet that were read. See `references/sources.md`.
