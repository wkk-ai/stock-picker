import snapshot from "@/data/snapshot.json";
import { analyzeSnapshot, type SnapStock } from "./advisor";
import { fairValue, findStock, getSnapshot, getStore, listItem, type StockRow } from "./store";

export type ListItem = ReturnType<typeof listItem> & {
  pb?: number | null;
  dividend_yield?: number | null;
  ev_ebitda?: number | null;
  roa?: number | null;
};

export function richListItem(s: StockRow): ListItem {
  return {
    ...listItem(s),
    pb: s.indicators?.pb ?? null,
    dividend_yield: s.indicators?.dividend_yield ?? null,
    ev_ebitda: s.indicators?.ev_ebitda ?? null,
    roa: s.indicators?.roa ?? null,
  };
}

function selicValue() {
  return getSnapshot().macros.find((m) => m.code === "SELIC")?.value ?? null;
}

export function analyzeTicker(ticker: string) {
  const s = findStock(ticker);
  if (!s) return null;
  return analyzeSnapshot(s as SnapStock, snapshot.stocks as SnapStock[], selicValue());
}

export function stockDetailPayload(ticker: string) {
  const s = findStock(ticker);
  if (!s) return null;
  const st = getStore();
  const analysis = analyzeSnapshot(s as SnapStock, snapshot.stocks as SnapStock[], selicValue());
  const moat = { ...(s.moat || {}), ...(st.moatOverrides[s.ticker] || {}) };
  const news = snapshot.news
    .filter((n) => !n.ticker || n.ticker === s.ticker)
    .slice(0, 15)
    .map(({ title, url, source, published_at, summary }) => ({ title, url, source, published_at, summary }));
  const thesis = st.thesis[s.ticker] || s.thesis || null;
  return {
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    quote: s.quote,
    indicators: s.indicators,
    score: s.score,
    moat,
    fair_value: fairValue(s.indicators, s.quote?.price),
    statements: s.statements,
    news,
    peers: analysis.peers,
    thesis,
    checklist: analysis.checklist,
    analysis,
  };
}

export function screenStocks(q: Record<string, string>) {
  const sector = q.sector || "";
  let maxPe = q.max_pe ? Number(q.max_pe) : null;
  let minRoe = q.min_roe ? Number(q.min_roe) : null;
  let minScore = q.min_score ? Number(q.min_score) : null;
  const minDy = q.min_dy ? Number(q.min_dy) / 100 : null;
  const preset = q.preset || "";
  if (preset === "quality") {
    minRoe = minRoe ?? 0.15;
    minScore = minScore ?? 70;
  } else if (preset === "value") {
    maxPe = maxPe ?? 10;
    minScore = minScore ?? 55;
  } else if (preset === "income") {
    // min 5% yield
    // handled below
  }
  let rows = snapshot.stocks as StockRow[];
  if (sector) rows = rows.filter((s) => s.sector.toLowerCase() === sector.toLowerCase());
  if (maxPe != null) rows = rows.filter((s) => s.indicators?.pe != null && s.indicators.pe <= maxPe!);
  if (minRoe != null) rows = rows.filter((s) => s.indicators?.roe != null && s.indicators.roe >= minRoe!);
  if (minScore != null) rows = rows.filter((s) => s.score && s.score.composite >= minScore!);
  const yieldFloor = preset === "income" ? 0.05 : minDy;
  if (yieldFloor != null) {
    rows = rows.filter((s) => s.indicators?.dividend_yield != null && s.indicators.dividend_yield >= yieldFloor);
  }
  return rows.map(richListItem).sort((a, b) => (b.composite || 0) - (a.composite || 0));
}

export function heatmap() {
  const buckets: Record<string, number[]> = {};
  for (const s of snapshot.stocks) {
    if (!s.score) continue;
    (buckets[s.sector] ||= []).push(s.score.composite);
  }
  return {
    sectors: Object.entries(buckets)
      .map(([sector, vals]) => ({
        sector,
        avg_score: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
        count: vals.length,
      }))
      .sort((a, b) => b.avg_score - a.avg_score),
  };
}

export function sectors() {
  const buckets: Record<string, number> = {};
  for (const s of snapshot.stocks) buckets[s.sector] = (buckets[s.sector] || 0) + 1;
  return {
    sectors: Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sector, count]) => ({ sector, count })),
  };
}

export function portfolioPayload() {
  const st = getStore();
  const positions = st.portfolio.map((p) => {
    const s = findStock(p.ticker);
    const price = s?.quote?.price ?? p.avg_price;
    const value = price * p.quantity;
    return {
      ticker: p.ticker,
      quantity: p.quantity,
      avg_price: p.avg_price,
      price,
      value,
      pnl_pct: p.avg_price ? (price / p.avg_price - 1) * 100 : 0,
      sector: s?.sector || "",
      note: p.note,
      weight: 0,
    };
  });
  const total = positions.reduce((a, p) => a + p.value, 0);
  for (const p of positions) p.weight = total ? (p.value / total) * 100 : 0;
  const bySector: Record<string, number> = {};
  for (const p of positions) bySector[p.sector] = (bySector[p.sector] || 0) + p.weight;
  const warnings = Object.entries(bySector)
    .filter(([, v]) => v >= 35)
    .map(([k, v]) => `${k} is ${Math.round(v)}% of the portfolio`);
  return {
    equity: total,
    positions,
    allocation: Object.entries(bySector).map(([sector, weight]) => ({
      sector,
      weight: Math.round(weight * 10) / 10,
    })),
    warnings,
    disclaimer: snapshot.disclaimer,
  };
}

export function alertsPayload() {
  const st = getStore();
  return st.alerts.map((a) => {
    let status = a.status;
    if (a.kind === "price" && a.ticker && a.threshold != null) {
      const s = findStock(a.ticker);
      const price = s?.quote?.price;
      status = price != null && price <= a.threshold ? "Triggered" : "Armed";
    } else if (a.kind === "indicator" && a.ticker && a.threshold != null) {
      const s = findStock(a.ticker);
      const pe = s?.indicators?.pe;
      status = pe != null && pe <= a.threshold ? "Triggered" : "Armed";
    }
    return { ...a, status };
  });
}

export function scenarioPayload(delta: number) {
  return {
    selic_delta: delta,
    impacts: Object.entries(snapshot.sector_macro).map(([sector, sens]) => ({
      sector,
      score_nudge: Math.round((((sens as { selic?: number }).selic || 0) * delta * 3) * 10) / 10,
      note: "Rough what-if only — not a forecast.",
    })),
    disclaimer: snapshot.disclaimer,
  };
}

export function newsPayload() {
  return snapshot.news.slice(0, 50).map(({ title, url, source, published_at, summary }) => ({
    title,
    url,
    source,
    published_at,
    summary,
  }));
}

export function screenerCsv(rows: ListItem[]) {
  const lines = ["ticker,name,sector,price,pe,roe,score,band"];
  for (const i of rows) {
    lines.push(`${i.ticker},${(i.name || "").replace(/,/g, " ")},${i.sector},${i.price},${i.pe},${i.roe},${i.composite},${i.band}`);
  }
  return lines.join("\n");
}
