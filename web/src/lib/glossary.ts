/** Plain-language copy for every metric and desk term. */

export type GlossaryEntry = {
  term: string;
  label: string;
  short: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  pe: {
    term: "P/L",
    label: "Years of profit you pay (P/L)",
    short: "How many years of this year’s profit today’s price buys. Lower can mean cheaper — or that profits may fall.",
  },
  pb: {
    term: "P/VP",
    label: "Price vs book equity (P/VP)",
    short: "Price compared with the equity sitting on the books. Banks often use this more than operating multiples.",
  },
  ev_ebitda: {
    term: "EV/EBITDA",
    label: "Whole-company price vs operating profit",
    short: "Price of shares plus net debt, versus operating profit. Skipped for banks and insurers.",
  },
  dividend_yield: {
    term: "Dividend yield",
    label: "Cash dividend vs the price",
    short: "Cash dividends over the last year as a % of the share price. High yield is only good if cash can support it.",
  },
  roe: {
    term: "ROE",
    label: "Profit on owners’ money (ROE)",
    short: "Profit the company earns on its own equity. Higher than peers usually means a stronger business.",
  },
  roa: {
    term: "ROA",
    label: "Profit on all assets (ROA)",
    short: "Profit earned on everything the company owns, not just equity. Useful for banks and heavy-asset firms.",
  },
  roic: {
    term: "ROIC",
    label: "Profit on money used in the business (ROIC)",
    short: "Return on the capital actually used to run the business. Shows whether growth earns its keep.",
  },
  net_margin: {
    term: "Net margin",
    label: "Profit left from each real of sales",
    short: "How many cents of profit remain from each real of sales after everything is paid.",
  },
  ebitda_margin: {
    term: "Operating margin",
    label: "Operating profit from each real of sales",
    short: "Operating profit from each real of sales, before interest and tax.",
  },
  revenue_growth: {
    term: "Sales growth",
    label: "Did sales grow last year?",
    short: "Whether last year’s sales beat the year before. One year is a clue, not the whole story.",
  },
  earnings_growth: {
    term: "Profit growth",
    label: "Did profit grow last year?",
    short: "Whether last year’s profit beat the year before.",
  },
  debt_equity: {
    term: "Debt / equity",
    label: "Borrowed money vs owners’ money",
    short: "How leveraged the balance sheet is. Higher means less room if the cycle turns. Not used for banks.",
  },
  current_ratio: {
    term: "Current ratio",
    label: "Can it pay bills due soon?",
    short: "Short-term assets versus bills due soon. Around 1 or higher is usually healthier. Not used for banks.",
  },
  earnings_yield: {
    term: "Earnings yield",
    label: "Yearly profit as a % of the price",
    short: "The profit return you get at today’s price if earnings hold. Compare it with Brazil’s interest rate.",
  },
  earnings_vs_selic: {
    term: "Yield vs Selic",
    label: "Profit yield vs Brazil’s interest rate",
    short: "How the stock’s profit yield compares with Brazil’s key rate. Negative means cash pays more than this stock’s earnings.",
  },
  payout: {
    term: "Payout",
    label: "Share of profit paid as dividends",
    short: "Share of yearly profit paid as dividends. Above 100% means it paid out more than it earned.",
  },
  div_coverage: {
    term: "Coverage",
    label: "How many times profit covers the dividend",
    short: "How many times earnings cover the dividend. Below 1 means the payout ate more than the year’s profit.",
  },
  peg: {
    term: "PEG",
    label: "Price vs profit, adjusted for growth",
    short: "P/L divided by profit growth. Near 1 can mean the price matches the growth; only works if profits are rising.",
  },
  ps: {
    term: "P/S",
    label: "Years of sales the price buys (P/S)",
    short: "How many years of sales the market price buys. Lower can mean cheaper, especially when margins are thin.",
  },
  lpa: {
    term: "LPA",
    label: "Profit for one share, in reais",
    short: "Last year’s profit divided by shares — in reais per share. Not comparable across companies of different size.",
  },
  vpa: {
    term: "VPA",
    label: "Book equity for one share, in reais",
    short: "Equity on the books divided by shares. Price / book is price divided by this number.",
  },
  asset_turnover: {
    term: "Asset turnover",
    label: "Sales generated from the company’s assets",
    short: "How much sales the company gets from the assets it owns.",
  },
  dy_vs_selic: {
    term: "DY vs Selic",
    label: "Dividend vs Brazil’s interest rate",
    short: "Dividend yield minus Brazil’s key rate. Income names often try to beat or match cash rates.",
  },
  ev_sales: {
    term: "EV/Sales",
    label: "Whole-company price vs sales",
    short: "Price of shares plus net debt, versus a year of sales. Useful when profits jump around.",
  },
  ebitda_yield: {
    term: "EBITDA yield",
    label: "Operating profit as a % of company value",
    short: "Operating profit divided by whole-company price. The flip side of EV/EBITDA.",
  },
  roic_vs_selic: {
    term: "ROIC vs Selic",
    label: "Business return vs Brazil’s interest rate",
    short: "Profit on invested capital minus Brazil’s key rate. Positive means the business earns more than cash.",
  },
  sustainable_growth: {
    term: "Sustainable growth",
    label: "Growth the dividend still allows",
    short: "ROE times the share of profit kept in the business. A ceiling if payout and returns stay the same.",
  },
  retention: {
    term: "Retention",
    label: "Share of profit kept in the business",
    short: "The part of profit not paid as dividends. Higher means more fuel for growth, less cash to you now.",
  },
  real_earnings_yield: {
    term: "Real earnings yield",
    label: "Profit yield after inflation",
    short: "Earnings yield minus 12-month inflation (IPCA). What is left after prices in the shops rise.",
  },
  graham: {
    term: "Graham",
    label: "Graham textbook price",
    short: "A classic shortcut from profit-per-share and book-per-share. A study aid, not a target price.",
  },
  financial_leverage: {
    term: "Leverage",
    label: "How much ROE rides on borrowed money",
    short: "ROE divided by ROA. A higher number means more of the owners’ return comes from gearing.",
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
    label: "Why customers might stay",
    short: "Why customers might stay: scale, rules, brand, cost edge, switching costs, network.",
  },
  macro_fit: {
    term: "Macro fit",
    label: "Fit with rates & inflation",
    short: "How this sector usually behaves when Brazil’s rate or inflation move. Banks like high rates; retailers do not.",
  },
  selic: {
    term: "Selic",
    label: "Brazil’s key interest rate",
    short: "The Central Bank’s main rate. When it rises, loans get pricier and many stocks get harder to own.",
  },
  ipca: {
    term: "IPCA",
    label: "Inflation over 12 months",
    short: "Brazil’s consumer-price inflation over 12 months.",
  },
  usd_brl: {
    term: "USD/BRL",
    label: "Reais per US dollar",
    short: "How many reais buy one US dollar. A weak real can help exporters.",
  },
  ibovespa: {
    term: "Ibovespa",
    label: "Brazil’s main stock list",
    short: "The big Brazilian stock-index universe this desk screens.",
  },
};

export const MISSING_METRICS = [
  {
    key: "cash_conversion",
    label: "Do profits turn into cash?",
    short: "Needs the company’s cash-flow filing. We do not have that line in this public snapshot.",
  },
  {
    key: "fcf_yield",
    label: "Free-cash-flow yield",
    short: "Cash left after keeping the business running, as a % of the price. Needs free-cash-flow filings.",
  },
  {
    key: "interest_coverage",
    label: "Can operating profit cover interest?",
    short: "Needs the interest-expense line from filings. Not in this snapshot.",
  },
  {
    key: "net_debt_ebitda",
    label: "Net debt vs operating profit",
    short: "Needs net debt. We also lack a market value for most names, so we cannot rebuild it here.",
  },
  {
    key: "gross_margin",
    label: "Gross margin",
    short: "Profit after the cost of goods, before other costs. Needs that line from filings.",
  },
  {
    key: "div_growth",
    label: "Did the dividend grow over the years?",
    short: "This snapshot has one year of yield, not a multi-year dividend history.",
  },
];
