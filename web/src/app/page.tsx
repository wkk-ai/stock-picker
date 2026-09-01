"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useEffect } from "react";
import { BandChip, Card, Disclaimer, Flash, GhostButton, Label, ScorePill, Sparkline } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { TickerList } from "@/components/TickerList";
import { GLOSSARY } from "@/lib/glossary";
import { api, fmtNum, fmtPct, type MacroItem, type StockListItem } from "@/lib/api";
import { getSnapshot } from "@/lib/store";
import { heatmap as heatFromSnap, newsPayload, richListItem } from "@/lib/research";

type Featured = {
  ticker: string;
  name: string;
  sector: string;
  quote?: { price?: number; change_percent?: number };
  indicators?: Record<string, number | null>;
  score?: { composite?: number; band?: string; moat?: number; macro_fit?: number };
};

const snap = getSnapshot();
const initialStocks = snap.stocks.map(richListItem);
const initialHeat = heatFromSnap().sectors;
const initialNews = newsPayload();
const initialMacros = snap.macros as MacroItem[];
const initialWatch = snap.watchlist
  .map((t) => snap.stocks.find((s) => s.ticker === t))
  .filter(Boolean)
  .map((s) => richListItem(s!));
const seed = snap.stocks.find((s) => s.ticker === snap.watchlist[0]) || snap.stocks[0];
const initialFeatured: Featured | null = seed
  ? {
      ticker: seed.ticker,
      name: seed.name,
      sector: seed.sector,
      quote: seed.quote,
      indicators: seed.indicators as unknown as Featured["indicators"],
      score: seed.score,
    }
  : null;

function macroLabel(code: string, value?: number | null) {
  if (value == null) return "—";
  if (code === "USD_BRL") return fmtNum(value, 2);
  if (code === "CDI" && Math.abs(value) < 1) return `${fmtNum(value, 4)}% d`;
  if (code === "IPCA") return `${fmtNum(value, 2)}% m`;
  if (code === "IPCA_12M") return `${fmtNum(value, 2)}%`;
  return `${fmtNum(value, 2)}%`;
}

export default function HomePage() {
  const [macros, setMacros] = useState<MacroItem[]>(initialMacros);
  const [watch, setWatch] = useState<StockListItem[]>(initialWatch);
  const [stocks, setStocks] = useState<StockListItem[]>(initialStocks);
  const [heat, setHeat] = useState<Array<{ sector: string; avg_score: number }>>(initialHeat);
  const [news, setNews] = useState<Array<{ title?: string; url?: string; source?: string }>>(initialNews);
  const [featured, setFeatured] = useState<Featured | null>(initialFeatured);
  const [status, setStatus] = useState<string>(`${initialStocks.length} Ibovespa names`);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [disclaimer, setDisclaimer] = useState(snap.disclaimer);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [onlyWatch, setOnlyWatch] = useState(false);

  const load = useCallback(async () => {
    const [m, w, all, h, n] = await Promise.all([
      api.macros(),
      api.watchlist(),
      api.stocks(),
      api.heatmap(),
      api.news(),
    ]);
    setMacros(m.items || []);
    setDisclaimer(m.disclaimer || "");
    setWatch(w);
    setStocks(all);
    setHeat(h.sectors || []);
    setNews(n as Array<{ title?: string; url?: string; source?: string }>);
    const ticker = w[0]?.ticker || all[0]?.ticker || "PETR4";
    const detail = (await api.stock(ticker)) as Featured;
    setFeatured(detail);
    try {
      const ds = await api.dataStatus();
      const bcb = ds.live_bcb ? "Banco Central" : "saved snapshot";
      const cvm = ds.live_cvm ? `CVM filings ${ds.cvm.annual_years.join(", ")}` : "saved filings";
      const count = ds.universe || all.length;
      setStatus(`${bcb} · ${cvm} · ${count} Ibovespa names`);
    } catch {
      setStatus(`${all.length} Ibovespa names`);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const watched = useMemo(() => new Set(watch.map((w) => w.ticker)), [watch]);
  const sectors = useMemo(
    () => [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort(),
    [stocks],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks
      .filter((s) => (onlyWatch ? watched.has(s.ticker) : true))
      .filter((s) => (sector ? s.sector === sector : true))
      .filter((s) =>
        !q
          ? true
          : s.ticker.toLowerCase().includes(q) ||
            (s.name || "").toLowerCase().includes(q) ||
            (s.sector || "").toLowerCase().includes(q),
      )
      .sort((a, b) => (b.composite || 0) - (a.composite || 0));
  }, [stocks, onlyWatch, watched, sector, query]);

  const selic = macros.find((m) => m.code === "SELIC");
  const usd = macros.find((m) => m.code === "USD_BRL");
  const ipca12 = macros.find((m) => m.code === "IPCA_12M");
  const ipca = ipca12 || macros.find((m) => m.code === "IPCA");
  const featuredItem = featured
    ? {
        ticker: featured.ticker,
        price: featured.quote?.price,
        change_percent: featured.quote?.change_percent,
        composite: featured.score?.composite,
        band: featured.score?.band,
      }
    : null;
  const up = (featuredItem?.change_percent || 0) >= 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span>{status || "Loading official series…"}</span>
        <GhostButton
          disabled={busy}
          className="text-[13px]"
          onClick={async () => {
            setBusy(true);
            setStatus("Updating prices, filings and industry comparisons…");
            setFlash("");
            try {
              const res = (await api.ingest()) as { note?: string };
              await load();
              setFlash(res?.note || "Numbers updated.");
            } catch {
              setStatus("Could not refresh official data");
              setFlash("Refresh failed. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Updating…" : "Refresh data"}
        </GhostButton>
      </div>
      <Flash text={flash} tone="info" />

      <div className="mb-4 overflow-hidden rounded-card border border-line bg-elev shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_.9fr]">
          <div className="bg-gradient-to-b from-sky to-white px-5 pb-2 pt-5">
            <div className="text-[13px] text-muted">
              {featured?.name} · {featured?.sector}
            </div>
            <div className="mt-1 font-mono text-[40px] font-semibold leading-none text-navy">
              {fmtNum(featuredItem?.price)}{" "}
              <span className={`text-[16px] ${up ? "text-accent" : "text-down"}`}>
                {featuredItem?.change_percent == null
                  ? ""
                  : `${featuredItem.change_percent >= 0 ? "+" : ""}${fmtNum(featuredItem.change_percent, 2)}%`}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center text-[13px] text-muted">
                Overall score {featuredItem?.composite != null ? Math.round(featuredItem.composite) : "—"}
                <InfoTip label="Overall score">{GLOSSARY.score.short}</InfoTip>
              </span>
              <BandChip band={featuredItem?.band} />
            </div>
            <div className="mt-4 flex gap-2">
              {featuredItem?.ticker ? (
                <Link
                  href={`/stocks/${featuredItem.ticker}`}
                  className="tap inline-flex flex-1 items-center justify-center rounded-pill bg-navy px-4 py-2.5 text-[14px] font-medium text-white sm:flex-none"
                >
                  Open {featuredItem.ticker}
                </Link>
              ) : null}
              {featuredItem?.ticker ? (
                <button
                  className="tap inline-flex flex-1 items-center justify-center rounded-pill border border-navy px-4 py-2.5 text-[14px] text-navy sm:flex-none"
                  onClick={async () => {
                    if (!featuredItem.ticker) return;
                    if (watched.has(featuredItem.ticker)) await api.removeWatch(featuredItem.ticker);
                    else await api.addWatch(featuredItem.ticker);
                    await load();
                  }}
                >
                  {featuredItem.ticker && watched.has(featuredItem.ticker) ? "Watching" : "Watch"}
                </button>
              ) : null}
            </div>
            <Sparkline up={up} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-5 py-5 text-[13px] lg:border-l lg:border-t-0">
            {[
              ["pe", "P/L", fmtNum(featured?.indicators?.pe ?? undefined, 1)],
              ["pb", "P/VP", fmtNum(featured?.indicators?.pb ?? undefined, 1)],
              ["roe", "ROE", fmtPct(featured?.indicators?.roe ?? undefined, 0)],
              ["dividend_yield", "Div. yield", fmtPct(featured?.indicators?.dividend_yield ?? undefined, 0)],
              ["moat", "Moat", featured?.score?.moat != null ? fmtNum(featured.score.moat, 0) : "—"],
              ["macro_fit", "Macro fit", featured?.score?.macro_fit != null ? fmtNum(featured.score.macro_fit, 0) : "—"],
            ].map(([key, k, v]) => (
              <div key={key}>
                <span className="inline-flex items-center text-muted">
                  {k}
                  <InfoTip label={String(k)}>{GLOSSARY[key]?.short || k}</InfoTip>
                </span>
                <b className="float-right font-mono font-medium">{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
        <Card className="min-w-[220px] snap-start">
          <Label hint={GLOSSARY.selic.short}>{GLOSSARY.selic.label}</Label>
          <div className="font-mono text-[26px] font-medium">{macroLabel("SELIC", selic?.value)}</div>
          <div className="mt-1 text-[13px] text-muted">Policy target · Central Bank {selic?.date || ""}</div>
        </Card>
        <Card className="min-w-[220px] snap-start">
          <Label hint={GLOSSARY.usd_brl.short}>{GLOSSARY.usd_brl.label}</Label>
          <div className="font-mono text-[26px] font-medium">{macroLabel("USD_BRL", usd?.value)}</div>
          <div className="mt-1 text-[13px] text-muted">Official sell rate (PTAX)</div>
        </Card>
        <Card className="min-w-[220px] snap-start">
          <Label hint={GLOSSARY.ipca.short}>{GLOSSARY.ipca.label}</Label>
          <div className="font-mono text-[26px] font-medium">
            {macroLabel(ipca12 ? "IPCA_12M" : "IPCA", ipca?.value)}
          </div>
          <div className="mt-1 text-[13px] text-muted">{ipca12 ? "12 months · BCB" : ipca?.date || "monthly"}</div>
        </Card>
      </div>

      <Card className="mb-4" pad={false} title="Brazil’s main stock list (Ibovespa)">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-[12px] text-faint">
            {visible.length} of {stocks.length}
          </span>
          <label className="sr-only" htmlFor="home-search">
            Search ticker or name
          </label>
          <input
            id="home-search"
            className="min-w-[160px] flex-1 border border-line bg-elev px-3 py-2.5 text-[16px] sm:max-w-[220px] md:text-[13px]"
            placeholder="Search ticker or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="sr-only" htmlFor="home-sector">
            Sector
          </label>
          <select
            id="home-sector"
            className="border border-line bg-elev px-3 py-2.5 text-[16px] md:text-[13px]"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            className={`tap border px-3 py-2.5 text-[13px] ${
              onlyWatch ? "border-navy bg-navy text-white" : "border-line text-muted hover:text-ink"
            }`}
            onClick={() => setOnlyWatch((v) => !v)}
          >
            {onlyWatch ? "Showing watchlist" : "Watchlist only"}
          </button>
        </div>
        <TickerList rows={visible} watched={watched} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sector scores">
          <ul className="space-y-1">
            {heat.map((s) => (
              <li key={s.sector}>
                <button
                  className="tap flex w-full items-center justify-between rounded-xl px-1 py-2 text-[13px] hover:bg-mist"
                  onClick={() => {
                    setSector(s.sector);
                    document.getElementById("home-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  <span className="text-muted">{s.sector}</span>
                  <ScorePill value={s.avg_score} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="News">
          <ul className="space-y-3">
            {news.slice(0, 5).map((n, i) => (
              <li key={i} className="text-[13px]">
                <a href={String(n.url || "#")} target="_blank" rel="noreferrer" className="leading-snug hover:text-accent">
                  {String(n.title)}
                </a>
                <div className="mt-0.5 text-[11px] text-faint">{String(n.source || "")}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Disclaimer text={disclaimer} />
    </div>
  );
}
