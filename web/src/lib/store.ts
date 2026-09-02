import snapshot from "@/data/snapshot.json";

export type StockRow = (typeof snapshot.stocks)[number];

type Store = {
  watchlist: string[];
  portfolio: Array<{ ticker: string; quantity: number; avg_price: number; note: string }>;
  alerts: Array<{
    id: number;
    kind: string;
    ticker?: string | null;
    rule: string;
    threshold?: number | null;
    status: string;
  }>;
  moatOverrides: Record<string, Partial<StockRow["moat"]>>;
  thesis: Record<string, { bull: string; base: string; bear: string; checklist: Record<string, boolean> }>;
  nextAlertId: number;
};

declare global {
  var __stockPickerStore: Store | undefined;
}

const LS_KEY = "stockpicker-desk-v1";

function defaultStore(): Store {
  return {
    watchlist: [...snapshot.watchlist],
    portfolio: snapshot.portfolio.map((p) => ({ ...p })),
    alerts: snapshot.alerts.map((a) => ({ ...a })),
    moatOverrides: {},
    thesis: {},
    nextAlertId: Math.max(0, ...snapshot.alerts.map((a) => a.id)) + 1,
  };
}

function loadLocal(): Partial<Store> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Store>) : null;
  } catch {
    return null;
  }
}

export function persistStore() {
  if (typeof window === "undefined" || !globalThis.__stockPickerStore) return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(globalThis.__stockPickerStore));
  } catch {
    /* ignore quota */
  }
}

function store(): Store {
  if (!globalThis.__stockPickerStore) {
    const base = defaultStore();
    const local = loadLocal();
    globalThis.__stockPickerStore = local
      ? {
          ...base,
          ...local,
          watchlist: local.watchlist || base.watchlist,
          portfolio: local.portfolio || base.portfolio,
          alerts: local.alerts || base.alerts,
          moatOverrides: local.moatOverrides || {},
          thesis: local.thesis || {},
          nextAlertId: local.nextAlertId || base.nextAlertId,
        }
      : base;
  }
  return globalThis.__stockPickerStore;
}

export function getSnapshot() {
  return snapshot;
}

export function getStore() {
  return store();
}

export function listItem(s: StockRow) {
  return {
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    price: s.quote?.price ?? null,
    change_percent: s.quote?.change_percent ?? null,
    pe: s.indicators?.pe ?? null,
    pb: s.indicators?.pb ?? null,
    dividend_yield: s.indicators?.dividend_yield ?? null,
    roe: s.indicators?.roe ?? null,
    composite: s.score?.composite ?? null,
    band: s.score?.band ?? null,
  };
}

export function findStock(ticker: string) {
  return snapshot.stocks.find((s) => s.ticker === ticker.toUpperCase()) || null;
}

export function fairValue(ind: StockRow["indicators"], price?: number | null) {
  const out: Record<string, number | null> = {
    graham: null,
    bazin: null,
    pe_fair: null,
    upside_pct: null,
  };
  if (!ind || !price) return out;
  if (ind.pe && ind.pb && ind.pe > 0 && ind.pb > 0) {
    const eps = price / ind.pe;
    const bvps = price / ind.pb;
    out.graham = Math.round(Math.sqrt(22.5 * eps * bvps) * 100) / 100;
    out.pe_fair = Math.round(eps * 12 * 100) / 100;
  }
  if (ind.dividend_yield && ind.dividend_yield > 0) {
    out.bazin = Math.round(((price * ind.dividend_yield) / 0.06) * 100) / 100;
  }
  const refs = [out.graham, out.bazin, out.pe_fair].filter((v): v is number => v != null);
  if (refs.length) {
    const mid = refs.reduce((a, b) => a + b, 0) / refs.length;
    out.upside_pct = Math.round((mid / price - 1) * 1000) / 10;
  }
  return out;
}

export function checklist(s: StockRow) {
  const ind = s.indicators;
  const sc = s.score;
  return [
    { key: "valuation", label: "Valuation reasonable", ok: !!(ind?.pe && ind.pe < 15) },
    { key: "moat", label: "Moat score ≥ 60", ok: !!(sc && sc.moat >= 60) },
    { key: "balance", label: "Debt under control", ok: !!(ind && (ind.debt_equity == null || ind.debt_equity < 1.5)) },
    { key: "macro", label: "Macro fit ≥ 50", ok: !!(sc && sc.macro_fit >= 50) },
    { key: "quality", label: "Quality ≥ 60", ok: !!(sc && sc.quality >= 60) },
  ];
}
