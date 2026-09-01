import { persistStore, findStock, getStore, getSnapshot } from "./store";
import {
  alertsPayload,
  heatmap,
  newsPayload,
  portfolioPayload,
  richListItem,
  scenarioPayload,
  screenStocks,
  screenerCsv,
  sectors,
  stockDetailPayload,
} from "./research";
import type { DataStatus, MacroItem, StockListItem } from "./types";

export type { StockListItem, MacroItem, DataStatus } from "./types";
export { fmtPct, fmtBRL, fmtNum, fmtMetric } from "./format";

const STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

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

function ok() {
  persistStore();
  return Promise.resolve({ ok: true });
}

const clientApi = {
  macros: () => Promise.resolve({ items: getSnapshot().macros as MacroItem[], disclaimer: getSnapshot().disclaimer }),
  stocks: () => Promise.resolve(getSnapshot().stocks.map(richListItem) as StockListItem[]),
  screener: (q: Record<string, string>) => Promise.resolve(screenStocks(q) as StockListItem[]),
  stock: (ticker: string) => {
    const d = stockDetailPayload(ticker);
    if (!d) return Promise.reject(new Error("not found"));
    return Promise.resolve(d as Record<string, unknown>);
  },
  watchlist: () =>
    Promise.resolve(
      getStore()
        .watchlist.map((t) => findStock(t))
        .filter(Boolean)
        .map((s) => richListItem(s!)) as StockListItem[],
    ),
  addWatch: (ticker: string) => {
    const t = ticker.toUpperCase();
    const st = getStore();
    if (!findStock(t)) return Promise.reject(new Error("not found"));
    if (!st.watchlist.includes(t)) st.watchlist.push(t);
    return ok();
  },
  removeWatch: (ticker: string) => {
    const st = getStore();
    st.watchlist = st.watchlist.filter((t) => t !== ticker.toUpperCase());
    return ok();
  },
  portfolio: () => Promise.resolve(portfolioPayload() as Record<string, unknown>),
  upsertPortfolio: (body: { ticker: string; quantity: number; avg_price: number }) => {
    const t = body.ticker.toUpperCase();
    if (!findStock(t)) return Promise.reject(new Error("not found"));
    const st = getStore();
    const existing = st.portfolio.find((p) => p.ticker === t);
    if (existing) {
      existing.quantity = Number(body.quantity);
      existing.avg_price = Number(body.avg_price);
    } else {
      st.portfolio.push({ ticker: t, quantity: Number(body.quantity), avg_price: Number(body.avg_price), note: "" });
    }
    return ok();
  },
  deletePortfolio: (ticker: string) => {
    const st = getStore();
    st.portfolio = st.portfolio.filter((p) => p.ticker !== ticker.toUpperCase());
    return ok();
  },
  alerts: () => Promise.resolve(alertsPayload() as Array<Record<string, unknown>>),
  createAlert: (body: Record<string, unknown>) => {
    const st = getStore();
    const id = st.nextAlertId++;
    st.alerts.push({
      id,
      kind: String(body.kind || "price"),
      ticker: body.ticker ? String(body.ticker) : null,
      rule: String(body.rule || ""),
      threshold: body.threshold == null ? null : Number(body.threshold),
      status: "Armed",
    });
    persistStore();
    return Promise.resolve({ ok: true, id });
  },
  deleteAlert: (id: number) => {
    const st = getStore();
    st.alerts = st.alerts.filter((a) => a.id !== id);
    return ok();
  },
  heatmap: () => Promise.resolve(heatmap()),
  sectors: () => Promise.resolve(sectors()),
  news: () => Promise.resolve(newsPayload() as Array<Record<string, unknown>>),
  scenario: (selic_delta: number) => Promise.resolve(scenarioPayload(selic_delta) as Record<string, unknown>),
  compare: (a: string, b: string) => {
    const left = findStock(a);
    const right = findStock(b);
    if (!left || !right) return Promise.reject(new Error("not found"));
    return Promise.resolve({ a: richListItem(left), b: richListItem(right) });
  },
  putMoat: (ticker: string, body: Record<string, unknown>) => {
    const t = ticker.toUpperCase();
    if (!findStock(t)) return Promise.reject(new Error("not found"));
    const st = getStore();
    st.moatOverrides[t] = { ...(st.moatOverrides[t] || {}), ...body };
    return ok();
  },
  putThesis: (ticker: string, body: Record<string, unknown>) => {
    const t = ticker.toUpperCase();
    if (!findStock(t)) return Promise.reject(new Error("not found"));
    const st = getStore();
    st.thesis[t] = {
      bull: String(body.bull || ""),
      base: String(body.base || ""),
      bear: String(body.bear || ""),
      checklist: (body.checklist as Record<string, boolean>) || {},
    };
    return ok();
  },
  ingest: () =>
    Promise.resolve({
      ok: true,
      note: "This public copy uses the latest saved snapshot. Live refresh needs the hosted API.",
    }),
  dataStatus: () =>
    Promise.resolve({
      live_bcb: false,
      live_cvm: false,
      universe: getSnapshot().stocks.length,
      bcb: getSnapshot().macros,
      cvm: { rows: 0, tickers: [], periods: [], annual_years: [] },
      disclaimer: getSnapshot().disclaimer,
    } as DataStatus),
  disclaimer: () => Promise.resolve({ disclaimer: getSnapshot().disclaimer, score_weights: getSnapshot().score_weights }),
  exportScreener: (q: Record<string, string>) => {
    const csv = screenerCsv(screenStocks(q));
    return Promise.resolve(csv);
  },
};

const fetchApi = {
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
  addWatch: (ticker: string) => getJSON("/api/watchlist", { method: "POST", body: JSON.stringify({ ticker }) }),
  removeWatch: (ticker: string) => getJSON(`/api/watchlist/${ticker}`, { method: "DELETE" }),
  portfolio: () => getJSON<Record<string, unknown>>("/api/portfolio"),
  upsertPortfolio: (body: { ticker: string; quantity: number; avg_price: number }) =>
    getJSON("/api/portfolio", { method: "POST", body: JSON.stringify(body) }),
  deletePortfolio: (ticker: string) => getJSON(`/api/portfolio/${ticker}`, { method: "DELETE" }),
  alerts: () => getJSON<Array<Record<string, unknown>>>("/api/alerts"),
  createAlert: (body: Record<string, unknown>) => getJSON("/api/alerts", { method: "POST", body: JSON.stringify(body) }),
  deleteAlert: (id: number) => getJSON(`/api/alerts/${id}`, { method: "DELETE" }),
  heatmap: () => getJSON<{ sectors: Array<{ sector: string; avg_score: number; count: number }> }>("/api/sectors/heatmap"),
  sectors: () => getJSON<{ sectors: Array<{ sector: string; count: number }> }>("/api/sectors"),
  news: () => getJSON<Array<Record<string, unknown>>>("/api/news"),
  scenario: (selic_delta: number) => getJSON<Record<string, unknown>>(`/api/scenario?selic_delta=${selic_delta}`),
  compare: (a: string, b: string) => getJSON<{ a: StockListItem; b: StockListItem }>(`/api/compare?a=${a}&b=${b}`),
  putMoat: (ticker: string, body: Record<string, unknown>) =>
    getJSON(`/api/stocks/${ticker}/moat`, { method: "PUT", body: JSON.stringify(body) }),
  putThesis: (ticker: string, body: Record<string, unknown>) =>
    getJSON(`/api/stocks/${ticker}/thesis`, { method: "PUT", body: JSON.stringify(body) }),
  ingest: () => getJSON("/api/admin/ingest", { method: "POST" }),
  dataStatus: () => getJSON<DataStatus>("/api/data-status"),
  disclaimer: () => getJSON<{ disclaimer: string; score_weights: Record<string, number> }>("/api/disclaimer"),
  exportScreener: async (q: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const res = await fetch(`${BASE}/api/export/screener.csv?${params}`);
    return res.text();
  },
};

export const api = STATIC ? clientApi : fetchApi;
