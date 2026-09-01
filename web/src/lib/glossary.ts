/** Plain-language copy for every metric and desk term. */

export type GlossaryEntry = {
  term: string;
  label: string;
  short: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  pe: {
    term: "P/L",
    label: "Price / profit (P/L)",
    short: "Years of this year’s profit you pay at today’s price. Lower can mean cheaper — or that profits may fall.",
  },
  pb: {
    term: "P/VP",
    label: "Price / book value (P/VP)",
    short: "Price versus the equity sitting on the books. Banks often use this more than operating multiples.",
  },
  ev_ebitda: {
    term: "EV/EBITDA",
    label: "Company value / operating profit (EV/EBITDA)",
    short: "Whole-company price (shares plus net debt) versus operating profit. Skipped for banks and insurers.",
  },
  dividend_yield: {
    term: "Dividend yield",
    label: "Dividend yield",
    short: "Cash dividends over the last year as a % of the share price. High yield is only good if cash can support it.",
  },
  roe: {
    term: "ROE",
    label: "Return on equity (ROE)",
    short: "Profit the company earns on its own equity. Higher than peers usually means a stronger business.",
  },
  roa: {
    term: "ROA",
    label: "Return on assets (ROA)",
    short: "Profit earned on all assets, not just equity. Useful for banks and heavy-asset firms.",
  },
  roic: {
    term: "ROIC",
    label: "Return on invested capital (ROIC)",
    short: "Return on the capital actually used in the business. Shows whether growth earns its keep.",
  },
  net_margin: {
    term: "Net margin",
    label: "Net margin",
    short: "How many cents of profit remain from each real of sales after everything is paid.",
  },
  ebitda_margin: {
    term: "Operating margin",
    label: "Operating margin (EBIT)",
    short: "Operating profit from each real of sales, before interest and tax.",
  },
  revenue_growth: {
    term: "Sales growth",
    label: "Sales growth",
    short: "Whether last year’s sales beat the year before. One year is a clue, not the whole story.",
  },
  earnings_growth: {
    term: "Profit growth",
    label: "Profit growth",
    short: "Whether last year’s profit beat the year before.",
  },
  debt_equity: {
    term: "Debt / equity",
    label: "Debt / equity",
    short: "How leveraged the balance sheet is. Higher means less room if the cycle turns. Not used for banks.",
  },
  current_ratio: {
    term: "Current ratio",
    label: "Short-term safety (current ratio)",
    short: "Short-term assets versus bills due soon. Around 1 or higher is usually healthier. Not used for banks.",
  },
  earnings_yield: {
    term: "Earnings yield",
    label: "Earnings yield (1 ÷ P/L)",
    short: "The profit return you get at today’s price if earnings hold. Compare it with Selic.",
  },
  earnings_vs_selic: {
    term: "Yield vs Selic",
    label: "Earnings yield vs Selic",
    short: "How the stock’s profit yield compares with Brazil’s key interest rate. Negative means cash pays more than this stock’s earnings.",
  },
  payout: {
    term: "Payout",
    label: "Dividend payout",
    short: "Share of yearly profit paid as dividends. Above 100% means it paid out more than it earned.",
  },
  div_coverage: {
    term: "Coverage",
    label: "Dividend coverage",
    short: "How many times earnings cover the dividend. Below 1 means the payout ate more than the year’s profit.",
  },
  peg: {
    term: "PEG",
    label: "PEG (P/L ÷ growth)",
    short: "P/L adjusted for profit growth. Near 1 can mean the price matches the growth; only works if profits are rising.",
  },
  ps: {
    term: "P/S",
    label: "Price / sales (P/S)",
    short: "How many years of sales the market price buys. Lower can mean cheaper, especially when margins are thin.",
  },
  lpa: {
    term: "LPA",
    label: "Profit per share (LPA)",
    short: "Last year’s profit divided by shares — in reais per share. Not comparable across companies of different size.",
  },
  vpa: {
    term: "VPA",
    label: "Book value per share (VPA)",
    short: "Equity on the books divided by shares. P/VP is price divided by this number.",
  },
  asset_turnover: {
    term: "Asset turnover",
    label: "Asset turnover",
    short: "How hard the company’s assets work to generate sales.",
  },
  dy_vs_selic: {
    term: "DY vs Selic",
    label: "Dividend vs Selic",
    short: "Dividend yield minus the Selic rate. Income names often try to beat or match cash rates.",
  },
  score: {
    term: "Score",
    label: "Overall score (0–100)",
    short: "Blend of cheapness, profitability, competitive edge, and how the sector sits with interest rates. Not a buy order.",
  },
  band: {
    term: "Band",
    label: "Verdict band",
    short: "Attractive 80+, Fair 65+, Caution 50+, Avoid below 50. A first read, not licensed advice.",
  },
  moat: {
    term: "Moat",
    label: "Competitive edge (moat)",
    short: "Why customers might stay: scale, rules, brand, cost edge, switching costs, network.",
  },
  macro_fit: {
    term: "Macro fit",
    label: "Fit with rates & inflation",
    short: "How this sector usually behaves when Selic or inflation move. Banks like high rates; retailers do not.",
  },
  selic: {
    term: "Selic",
    label: "Brazil’s key interest rate (Selic)",
    short: "The Central Bank’s main rate. When it rises, loans get pricier and many stocks get harder to own.",
  },
  ipca: {
    term: "IPCA",
    label: "Inflation (IPCA)",
    short: "Brazil’s consumer-price inflation over 12 months.",
  },
  usd_brl: {
    term: "USD/BRL",
    label: "Dollar in reais (USD/BRL)",
    short: "How many reais buy one US dollar. A weak real can help exporters.",
  },
  ibovespa: {
    term: "Ibovespa",
    label: "Brazil’s main stock list (Ibovespa)",
    short: "The big Brazilian stock-index universe this desk screens.",
  },
};
