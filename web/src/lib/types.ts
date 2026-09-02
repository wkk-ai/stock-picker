export type StockListItem = {
  ticker: string;
  name: string;
  sector: string;
  price?: number | null;
  change_percent?: number | null;
  pe?: number | null;
  pb?: number | null;
  dividend_yield?: number | null;
  ev_ebitda?: number | null;
  roa?: number | null;
  roe?: number | null;
  composite?: number | null;
  band?: string | null;
  note?: string;
};

export type MacroItem = {
  code: string;
  name: string;
  date?: string | null;
  value?: number | null;
  source?: string | null;
};

export type DataStatus = {
  live_bcb: boolean;
  live_cvm: boolean;
  universe?: number;
  bcb: MacroItem[];
  cvm: { rows: number; tickers: string[]; periods: string[]; annual_years: string[] };
  disclaimer: string;
};
