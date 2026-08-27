import { NextRequest, NextResponse } from "next/server";
import {
  checklist,
  fairValue,
  findStock,
  getSnapshot,
  getStore,
  listItem,
} from "@/lib/store";
import { proxyPython } from "@/lib/pythonProxy";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const parts = path || [];
  const live = await proxyPython(req.clone(), parts);
  if (live) return live;
  const snap = getSnapshot();
  const st = getStore();
  const q = req.nextUrl.searchParams;

  if (parts[0] === "health") {
    return json({ ok: true, disclaimer: snap.disclaimer, mode: "hostinger-node" });
  }
  if (parts[0] === "data-status") {
    return json({
      live_bcb: false,
      live_cvm: false,
      bcb: snap.macros,
      cvm: { rows: 0, tickers: [], periods: [], annual_years: [] },
      disclaimer: snap.disclaimer,
    });
  }
  if (parts[0] === "disclaimer") {
    return json({ disclaimer: snap.disclaimer, score_weights: snap.score_weights });
  }
  if (parts[0] === "macros") {
    return json({ items: snap.macros, disclaimer: snap.disclaimer });
  }
  if (parts[0] === "stocks" && parts.length === 1) {
    return json(snap.stocks.map(listItem));
  }
  if (parts[0] === "stocks" && parts[1]) {
    const s = findStock(parts[1]);
    if (!s) return json({ error: "not found" }, 404);
    const moat = { ...(s.moat || {}), ...(st.moatOverrides[s.ticker] || {}) };
    const peers = snap.stocks.filter((p) => p.sector === s.sector && p.ticker !== s.ticker).slice(0, 6).map(listItem);
    const news = snap.news
      .filter((n) => !n.ticker || n.ticker === s.ticker)
      .slice(0, 15)
      .map(({ title, url, source, published_at, summary }) => ({ title, url, source, published_at, summary }));
    const thesis = st.thesis[s.ticker] || s.thesis || null;
    return json({
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
      peers,
      thesis,
      checklist: checklist(s),
    });
  }
  if (parts[0] === "screener") {
    const sector = q.get("sector") || "";
    let maxPe = q.get("max_pe") ? Number(q.get("max_pe")) : null;
    let minRoe = q.get("min_roe") ? Number(q.get("min_roe")) : null;
    let minScore = q.get("min_score") ? Number(q.get("min_score")) : null;
    const preset = q.get("preset") || "";
    if (preset === "quality") {
      minRoe = minRoe ?? 0.15;
      minScore = minScore ?? 70;
    } else if (preset === "value") {
      maxPe = maxPe ?? 10;
      minScore = minScore ?? 55;
    }
    let rows = snap.stocks;
    if (sector) rows = rows.filter((s) => s.sector.toLowerCase() === sector.toLowerCase());
    if (maxPe != null) rows = rows.filter((s) => s.indicators?.pe != null && s.indicators.pe <= maxPe!);
    if (minRoe != null) rows = rows.filter((s) => s.indicators?.roe != null && s.indicators.roe >= minRoe!);
    if (minScore != null) rows = rows.filter((s) => s.score && s.score.composite >= minScore!);
    return json(rows.map(listItem).sort((a, b) => (b.composite || 0) - (a.composite || 0)));
  }
  if (parts[0] === "sectors" && parts[1] === "heatmap") {
    const buckets: Record<string, number[]> = {};
    for (const s of snap.stocks) {
      if (!s.score) continue;
      (buckets[s.sector] ||= []).push(s.score.composite);
    }
    return json({
      sectors: Object.entries(buckets)
        .map(([sector, vals]) => ({
          sector,
          avg_score: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
          count: vals.length,
        }))
        .sort((a, b) => b.avg_score - a.avg_score),
    });
  }
  if (parts[0] === "watchlist") {
    return json(
      st.watchlist
        .map((t) => findStock(t))
        .filter(Boolean)
        .map((s) => listItem(s!)),
    );
  }
  if (parts[0] === "portfolio") {
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
      .map(([k, v]) => `${k} is ${Math.round(v)}% of portfolio`);
    return json({
      equity: total,
      positions,
      allocation: Object.entries(bySector).map(([sector, weight]) => ({
        sector,
        weight: Math.round(weight * 10) / 10,
      })),
      warnings,
      disclaimer: snap.disclaimer,
    });
  }
  if (parts[0] === "alerts") {
    const alerts = st.alerts.map((a) => {
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
    return json(alerts);
  }
  if (parts[0] === "news") {
    const ticker = q.get("ticker");
    let items = snap.news;
    if (ticker) items = items.filter((n) => n.ticker === ticker.toUpperCase());
    return json(
      items.slice(0, 50).map(({ title, url, source, published_at, summary }) => ({
        title,
        url,
        source,
        published_at,
        summary,
      })),
    );
  }
  if (parts[0] === "compare") {
    const a = findStock(q.get("a") || "");
    const b = findStock(q.get("b") || "");
    if (!a || !b) return json({ error: "not found" }, 404);
    return json({ a: listItem(a), b: listItem(b) });
  }
  if (parts[0] === "scenario") {
    const delta = Number(q.get("selic_delta") || 0);
    return json({
      selic_delta: delta,
      impacts: Object.entries(snap.sector_macro).map(([sector, sens]) => ({
        sector,
        score_nudge: Math.round(((sens as { selic?: number }).selic || 0) * delta * 3 * 10) / 10,
        note: "Heuristic only",
      })),
      disclaimer: snap.disclaimer,
    });
  }
  if (parts[0] === "export" && parts[1] === "screener.csv") {
    const lines = ["ticker,name,sector,price,pe,roe,score,band"];
    for (const s of snap.stocks) {
      const i = listItem(s);
      lines.push(
        `${i.ticker},${i.name.replace(/,/g, " ")},${i.sector},${i.price},${i.pe},${i.roe},${i.composite},${i.band}`,
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  return json({ error: "not found", path: parts }, 404);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const parts = path || [];
  const live = await proxyPython(req.clone(), parts);
  if (live) return live;
  const st = getStore();
  const body = await req.json().catch(() => ({}));

  if (parts[0] === "watchlist") {
    const t = String(body.ticker || "").toUpperCase();
    if (!findStock(t)) return json({ error: "not found" }, 404);
    if (!st.watchlist.includes(t)) st.watchlist.push(t);
    return json({ ok: true });
  }
  if (parts[0] === "portfolio") {
    const t = String(body.ticker || "").toUpperCase();
    if (!findStock(t)) return json({ error: "not found" }, 404);
    const existing = st.portfolio.find((p) => p.ticker === t);
    if (existing) {
      existing.quantity = Number(body.quantity);
      existing.avg_price = Number(body.avg_price);
      existing.note = body.note || "";
    } else {
      st.portfolio.push({
        ticker: t,
        quantity: Number(body.quantity),
        avg_price: Number(body.avg_price),
        note: body.note || "",
      });
    }
    return json({ ok: true });
  }
  if (parts[0] === "alerts") {
    const id = st.nextAlertId++;
    st.alerts.push({
      id,
      kind: body.kind,
      ticker: body.ticker || null,
      rule: body.rule,
      threshold: body.threshold ?? null,
      status: "Armed",
    });
    return json({ ok: true, id });
  }
  if (parts[0] === "admin" && parts[1] === "ingest") {
    return json({ ok: true, note: "Snapshot mode on Hostinger — re-bootstrap locally to refresh data." });
  }
  return json({ error: "not found" }, 404);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const parts = path || [];
  const live = await proxyPython(req.clone(), parts);
  if (live) return live;
  const st = getStore();
  const body = await req.json().catch(() => ({}));

  if (parts[0] === "stocks" && parts[2] === "moat") {
    const t = parts[1].toUpperCase();
    if (!findStock(t)) return json({ error: "not found" }, 404);
    st.moatOverrides[t] = { ...(st.moatOverrides[t] || {}), ...body };
    return json({ ok: true });
  }
  if (parts[0] === "stocks" && parts[2] === "thesis") {
    const t = parts[1].toUpperCase();
    if (!findStock(t)) return json({ error: "not found" }, 404);
    st.thesis[t] = {
      bull: body.bull || "",
      base: body.base || "",
      bear: body.bear || "",
      checklist: body.checklist || {},
    };
    return json({ ok: true });
  }
  return json({ error: "not found" }, 404);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const parts = path || [];
  const live = await proxyPython(req.clone(), parts);
  if (live) return live;
  const st = getStore();

  if (parts[0] === "watchlist" && parts[1]) {
    st.watchlist = st.watchlist.filter((t) => t !== parts[1].toUpperCase());
    return json({ ok: true });
  }
  if (parts[0] === "portfolio" && parts[1]) {
    st.portfolio = st.portfolio.filter((p) => p.ticker !== parts[1].toUpperCase());
    return json({ ok: true });
  }
  if (parts[0] === "alerts" && parts[1]) {
    const id = Number(parts[1]);
    st.alerts = st.alerts.filter((a) => a.id !== id);
    return json({ ok: true });
  }
  return json({ error: "not found" }, 404);
}
