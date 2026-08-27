export type StockListItem = {
  ticker: string;
  name: string;
  sector: string;
  price?: number | null;
  change_percent?: number | null;
  pe?: number | null;
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

const BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "https://stocks.worldhealthshop.com"
    : "";

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return res.json();
}

export const api = {
  macros: () => getJSON<{ items: MacroItem[]; disclaimer: string }>("/api/macros"),
  stocks: () => getJSON<StockListItem[]>("/api/stocks"),
  screener: (q: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return getJSON<StockListItem[]>(`/api/screener?${params}`);
  },
  stock: (ticker: string) => getJSON<Record<string, unknown>>(`/api/stocks/${ticker}`),
  watchlist: () => getJSON<StockListItem[]>("/api/watchlist"),
  addWatch: (ticker: string) =>
    getJSON("/api/watchlist", { method: "POST", body: JSON.stringify({ ticker }) }),
  removeWatch: (ticker: string) =>
    getJSON(`/api/watchlist/${ticker}`, { method: "DELETE" }),
  portfolio: () => getJSON<Record<string, unknown>>("/api/portfolio"),
  upsertPortfolio: (body: { ticker: string; quantity: number; avg_price: number }) =>
    getJSON("/api/portfolio", { method: "POST", body: JSON.stringify(body) }),
  deletePortfolio: (ticker: string) =>
    getJSON(`/api/portfolio/${ticker}`, { method: "DELETE" }),
  alerts: () => getJSON<Array<Record<string, unknown>>>("/api/alerts"),
  createAlert: (body: Record<string, unknown>) =>
    getJSON("/api/alerts", { method: "POST", body: JSON.stringify(body) }),
  deleteAlert: (id: number) => getJSON(`/api/alerts/${id}`, { method: "DELETE" }),
  heatmap: () => getJSON<{ sectors: Array<{ sector: string; avg_score: number; count: number }> }>("/api/sectors/heatmap"),
  sectors: () => getJSON<{ sectors: Array<{ sector: string; count: number }> }>("/api/sectors"),
  news: () => getJSON<Array<Record<string, unknown>>>("/api/news"),
  scenario: (selic_delta: number) =>
    getJSON<Record<string, unknown>>(`/api/scenario?selic_delta=${selic_delta}`),
  compare: (a: string, b: string) =>
    getJSON<{ a: StockListItem; b: StockListItem }>(`/api/compare?a=${a}&b=${b}`),
  putMoat: (ticker: string, body: Record<string, unknown>) =>
    getJSON(`/api/stocks/${ticker}/moat`, { method: "PUT", body: JSON.stringify(body) }),
  putThesis: (ticker: string, body: Record<string, unknown>) =>
    getJSON(`/api/stocks/${ticker}/thesis`, { method: "PUT", body: JSON.stringify(body) }),
  ingest: () => getJSON("/api/admin/ingest", { method: "POST" }),
  dataStatus: () => getJSON<DataStatus>("/api/data-status"),
  disclaimer: () => getJSON<{ disclaimer: string; score_weights: Record<string, number> }>("/api/disclaimer"),
};

export function fmtPct(v?: number | null, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  const pct = Math.abs(v) <= 1.5 && Math.abs(v) > 0 ? v * 100 : v;
  return `${pct.toFixed(digits)}%`;
}

export function fmtBRL(v?: number | null) {
  if (v == null || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (abs >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function fmtNum(v?: number | null, digits = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}
