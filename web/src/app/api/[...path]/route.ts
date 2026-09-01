import { NextRequest, NextResponse } from "next/server";
import { findStock, getSnapshot, getStore } from "@/lib/store";
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
} from "@/lib/research";
import { persistStore } from "@/lib/store";
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
    return json(snap.stocks.map(richListItem));
  }
  if (parts[0] === "stocks" && parts[1]) {
    const d = stockDetailPayload(parts[1]);
    if (!d) return json({ error: "not found" }, 404);
    return json(d);
  }
  if (parts[0] === "screener") {
    const query: Record<string, string> = {};
    q.forEach((v, k) => {
      query[k] = v;
    });
    return json(screenStocks(query));
  }
  if (parts[0] === "sectors" && !parts[1]) {
    return json(sectors());
  }
  if (parts[0] === "sectors" && parts[1] === "heatmap") {
    return json(heatmap());
  }
  if (parts[0] === "watchlist") {
    return json(
      st.watchlist
        .map((t) => findStock(t))
        .filter(Boolean)
        .map((s) => richListItem(s!)),
    );
  }
  if (parts[0] === "portfolio") {
    return json(portfolioPayload());
  }
  if (parts[0] === "alerts") {
    return json(alertsPayload());
  }
  if (parts[0] === "news") {
    const ticker = q.get("ticker");
    let items = newsPayload();
    if (ticker) items = items.filter((n) => (n as { ticker?: string }).ticker === ticker.toUpperCase());
    return json(items);
  }
  if (parts[0] === "compare") {
    const a = findStock(q.get("a") || "");
    const b = findStock(q.get("b") || "");
    if (!a || !b) return json({ error: "not found" }, 404);
    return json({ a: richListItem(a), b: richListItem(b) });
  }
  if (parts[0] === "scenario") {
    return json(scenarioPayload(Number(q.get("selic_delta") || 0)));
  }
  if (parts[0] === "export" && parts[1] === "screener.csv") {
    const query: Record<string, string> = {};
    q.forEach((v, k) => {
      query[k] = v;
    });
    return new NextResponse(screenerCsv(screenStocks(query)), {
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
    persistStore();
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
