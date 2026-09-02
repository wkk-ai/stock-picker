"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, fmtBRL, fmtNum, fmtPct } from "@/lib/api";
import { BandChip, Card, Disclaimer, Flash, Label, PrimaryButton, ScorePill } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { MetricBlock, MissingMetrics } from "@/components/MetricBlock";
import { GLOSSARY } from "@/lib/glossary";
import type { MetricRow } from "@/lib/advisor";

type Peer = {
  ticker: string;
  name?: string;
  pe?: number | null;
  pb?: number | null;
  roe?: number | null;
  dividend_yield?: number | null;
  composite?: number | null;
  is_self?: boolean;
};

type Trend = {
  period: string;
  revenue?: number | null;
  net_income?: number | null;
  operating_cf?: number | null;
  equity?: number | null;
  margin?: number | null;
};

type Analysis = {
  stance?: string;
  stance_reason?: string;
  headline?: string;
  summary?: string;
  bullets?: { working?: string[]; catch?: string[]; watch?: string[] };
  benchmark_label?: string;
  peer_count?: number;
  metrics?: MetricRow[];
  implied?: {
    price?: number | null;
    fairish?: number | null;
    method?: string;
    upside_pct?: number | null;
    caveat?: string;
    explain?: string;
  };
  cash?: { ocf_to_earnings?: number | null; payout?: number | null };
  trends?: Trend[];
  trend_note?: string;
  peers?: Peer[];
  caveat?: string;
};

type Detail = {
  ticker: string;
  name: string;
  sector: string;
  quote?: { price?: number; change_percent?: number; volume?: number | null };
  indicators?: Record<string, number | string | null>;
  score?: {
    quality: number;
    value: number;
    moat: number;
    macro_fit: number;
    composite: number;
    band: string;
    rationale: string;
  };
  moat?: {
    scale: number;
    regulation: number;
    brand: number;
    cost_advantage: number;
    switching_costs: number;
    network: number;
    summary: string;
  };
  fair_value?: Record<string, number | null>;
  statements?: Array<{ period: string; type: string; account: string; value?: number; source: string }>;
  news?: Array<{ title: string; url: string; source: string }>;
  peers?: Peer[];
  checklist?: Array<{ key: string; label: string; ok: boolean; detail?: string }>;
  thesis?: { bull: string; base: string; bear: string };
  analysis?: Analysis;
};

const tabs = ["The call", "Numbers", "Peers", "Risks", "Notes"] as const;

function stanceTone(stance?: string) {
  if (stance === "Attractive") return "text-accent";
  if (stance === "Avoid") return "text-down";
  if (stance === "Caution") return "text-watch";
  return "text-navy";
}

export function StockDesk({ initial, ticker: tickerProp }: { initial?: Detail | null; ticker?: string }) {
  const params = useParams();
  const ticker = (tickerProp || String(params.ticker || "")).toUpperCase();
  const [tab, setTab] = useState<(typeof tabs)[number]>("The call");
  const [data, setData] = useState<Detail | null>(initial || null);
  const [bull, setBull] = useState(initial?.thesis?.bull || "");
  const [base, setBase] = useState(initial?.thesis?.base || "");
  const [bear, setBear] = useState(initial?.thesis?.bear || "");
  const [moatSummary, setMoatSummary] = useState(initial?.moat?.summary || "");
  const [watching, setWatching] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!ticker) return;
    api.stock(ticker).then((d) => {
      const detail = d as Detail;
      setData(detail);
      setBull(detail.thesis?.bull || "");
      setBase(detail.thesis?.base || "");
      setBear(detail.thesis?.bear || "");
      setMoatSummary(detail.moat?.summary || "");
    });
    api.watchlist().then((w) => setWatching(w.some((x) => x.ticker === ticker)));
  }, [ticker]);

  if (!data) return <p className="text-muted">Loading {ticker}…</p>;

  const analysis = data.analysis || {};
  const metrics = analysis.metrics || [];
  const bullets = analysis.bullets || {};
  const implied = analysis.implied || {};
  const peers = (analysis.peers && analysis.peers.length ? analysis.peers : data.peers) || [];
  const trends = analysis.trends || [];
  const up = (data.quote?.change_percent || 0) >= 0;

  async function toggleWatch() {
    if (!data) return;
    try {
      if (watching) await api.removeWatch(data.ticker);
      else await api.addWatch(data.ticker);
      setWatching(!watching);
      setFlash(watching ? "Removed from watchlist." : "Added to watchlist.");
    } catch {
      setFlash("Could not update watchlist.");
    }
  }

  return (
    <div>
      <Link href="/" className="mb-3 inline-flex min-h-[44px] items-center text-[13px] text-muted hover:text-navy">
        ← All stocks
      </Link>
      <div className="mb-4 overflow-hidden rounded-card border border-line bg-elev shadow-card">
        <div className="bg-gradient-to-b from-sky to-white px-5 pb-5 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[13px] tracking-wide text-muted">{data.ticker}</div>
              <div className="mt-0.5 text-[15px] font-medium text-navy">{data.name}</div>
              <div className="mt-1 text-[12px] text-muted">
                {data.sector}
                {analysis.benchmark_label ? ` · vs ${analysis.benchmark_label}` : ""}
              </div>
            </div>
            <button
              className={`tap shrink-0 border px-4 py-2.5 text-[14px] ${
                watching ? "border-navy bg-navy text-white" : "border-navy text-navy"
              }`}
              onClick={toggleWatch}
            >
              {watching ? "Watching" : "+ Watchlist"}
            </button>
          </div>
          <div className="mt-4 font-mono text-[36px] font-semibold leading-none text-navy md:text-[40px]">
            {fmtNum(data.quote?.price) === "—" ? "—" : `R$ ${fmtNum(data.quote?.price)}`}
            {data.quote?.change_percent != null && (
              <span className={`ml-2 text-[16px] font-medium ${up ? "text-accent" : "text-down"}`}>
                {up ? "+" : ""}
                {fmtNum(data.quote.change_percent, 2)}%
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`text-[18px] font-semibold ${stanceTone(analysis.stance || data.score?.band)}`}>
              {analysis.stance || data.score?.band || "—"}
            </span>
            <BandChip band={data.score?.band} />
            <span className="inline-flex items-center text-[13px] text-muted">
              Score {data.score?.composite ?? "—"}
              <InfoTip label="Overall score">{GLOSSARY.score.short}</InfoTip>
            </span>
          </div>
        </div>
      </div>
      <Flash text={flash} />

      <div
        className="mb-5 -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0"
        role="tablist"
        aria-label="Company sections"
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`tap whitespace-nowrap px-3.5 py-3 text-[13px] ${
              tab === t ? "border-b-2 border-gold font-semibold text-navy" : "text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "The call" && (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]" role="tabpanel">
          <Card className="animate-fade-up">
            <Label hint="A plain-language call from industry checks — not licensed advice.">Advisor take</Label>
            <p className="mt-3 text-[15px] leading-relaxed text-ink">
              {analysis.headline || analysis.stance_reason || "Industry comparison is still loading."}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{analysis.summary}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Quality", data.score?.quality, GLOSSARY.roe.short],
                ["Cheapness", data.score?.value, GLOSSARY.pe.short],
                ["Moat", data.score?.moat, GLOSSARY.moat.short],
                ["Rates fit", data.score?.macro_fit, GLOSSARY.macro_fit.short],
              ].map(([k, v, hint]) => (
                <div key={k as string} className="rounded-2xl bg-mist px-3 py-3">
                  <div className="inline-flex items-center text-[11px] uppercase tracking-[0.08em] text-muted">
                    {k as string}
                    <InfoTip label={k as string}>{hint as string}</InfoTip>
                  </div>
                  <div className="mt-1 font-mono text-[18px]">{v != null ? Math.round(v as number) : "—"}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Label hint="If this stock used the typical peer multiple. Snapshot, not a target price.">
              If it traded like its industry
            </Label>
            <div className="mt-1 font-mono text-[28px] font-semibold text-navy">
              {implied.fairish != null ? fmtNum(implied.fairish) : "—"}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {implied.method ? `Using typical ${implied.method}` : "Needs a clean industry multiple"}
              {implied.upside_pct != null ? ` · ${implied.upside_pct >= 0 ? "+" : ""}${fmtNum(implied.upside_pct, 1)}% vs last price` : ""}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{implied.explain}</p>
            {implied.caveat ? <p className="mt-3 text-[12px] leading-relaxed text-faint">{implied.caveat}</p> : null}
          </Card>

          <Card className="lg:col-span-2">
            <Label>In one minute</Label>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {[
                ["What is working", bullets.working],
                ["The catch", bullets.catch],
                ["Watch next", bullets.watch],
              ].map(([title, items]) => (
                <div key={title as string}>
                  <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">{title as string}</div>
                  <ul className="space-y-2 text-sm leading-relaxed text-ink">
                    {((items as string[]) || ["—"]).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <Label hint="A checklist before you decide how much to buy — not an auto-size.">
              Five questions before you decide how much to buy
            </Label>
            <ul className="mt-2">
              {(data.checklist || []).map((c) => (
                <li key={c.key} className="border-t border-line py-3">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-ink">{c.label}</span>
                    <span className={`shrink-0 text-[12px] ${c.ok ? "text-accent" : "text-watch"}`}>
                      {c.ok ? "Yes" : "Look closer"}
                    </span>
                  </div>
                  {c.detail ? <p className="mt-1 text-[12px] leading-relaxed text-muted">{c.detail}</p> : null}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "Numbers" && (
        <div className="grid gap-6" role="tabpanel">
          <Card>
            <Label hint="Green means cheaper or stronger than the typical peer. Tap i on any row.">
              Every metric vs the industry
            </Label>
            <p className="mt-1 text-[12px] text-faint">
              Compared with {analysis.benchmark_label || "similar Ibovespa names"}
              {analysis.peer_count != null ? ` (${analysis.peer_count} other companies)` : ""}.
            </p>
            {metrics.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No industry sample yet. Refresh official data from the home screen.</p>
            ) : (
              <div className="mt-2">
                <MetricBlock metrics={metrics} />
              </div>
            )}
          </Card>

          <Card>
            <Label>Last reported years</Label>
            <p className="mt-1 text-[12px] text-faint">{analysis.trend_note || "Official CVM annual filings."}</p>
            {trends.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No CVM years loaded for this name yet.</p>
            ) : (
              <>
                <ul className="mt-3 space-y-3 md:hidden">
                  {trends.map((t) => (
                    <li key={t.period} className="rounded-2xl border border-line px-4 py-3">
                      <div className="font-mono text-[15px] text-navy">{t.period}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
                        <span className="text-muted">Sales {fmtBRL(t.revenue)}</span>
                        <span className="text-muted">Profit {fmtBRL(t.net_income)}</span>
                        <span className="text-muted">Cash {fmtBRL(t.operating_cf)}</span>
                        <span className="text-muted">Margin {fmtPct(t.margin)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="pb-2 font-medium">Year</th>
                      <th className="pb-2 font-medium">Sales</th>
                      <th className="pb-2 font-medium">Profit</th>
                      <th className="pb-2 font-medium">Operating cash</th>
                      <th className="pb-2 font-medium">Net margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((t) => (
                      <tr key={t.period} className="border-t border-line">
                        <td className="py-3 font-mono">{t.period}</td>
                        <td className="py-3 font-mono">{fmtBRL(t.revenue)}</td>
                        <td className="py-3 font-mono">{fmtBRL(t.net_income)}</td>
                        <td className="py-3 font-mono">{fmtBRL(t.operating_cf)}</td>
                        <td className="py-3 font-mono">{fmtPct(t.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Card>

          <Card>
            <Label hint="These need extra filings we do not have in this public copy. Tap i for what they mean.">
              Not on this snapshot yet
            </Label>
            <div className="mt-3">
              <MissingMetrics />
            </div>
          </Card>

          <Card>
            <Label hint="Textbook shortcuts, not a target price. The industry comparison above is the better first read.">
              Textbook models (use with care)
            </Label>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[
                  ["Price if valued like peers (P/L)", implied.fairish],
                  ["Graham fair-price shortcut", data.fair_value?.graham],
                  ["Bazin price for 6% yield", data.fair_value?.bazin],
                ].map(([k, v]) => (
                  <tr key={k as string} className="border-t border-line">
                    <td className="py-3 text-muted">{k}</td>
                    <td className="py-3 text-right font-mono">{fmtNum(v as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === "Peers" && (
        <div role="tabpanel">
        <Card>
          <Label>Same industry on the Ibovespa</Label>
          <p className="mt-1 text-[12px] text-faint">
            Sorted by P/L. This stock is highlighted. Banks are compared on P/L, P/VP, ROE and yield — not EV/EBITDA.
          </p>
          <ul className="mt-3 divide-y divide-line md:hidden">
            {peers.map((p) => (
              <li key={p.ticker} className={`px-1 py-3 ${p.is_self ? "rounded-xl bg-soft/60" : ""}`}>
                {p.is_self ? (
                  <div className="font-mono">{p.ticker}</div>
                ) : (
                  <Link className="font-mono hover:text-accent" href={`/stocks/${p.ticker}`}>
                    {p.ticker}
                  </Link>
                )}
                <div className="text-[12px] text-muted">{p.name}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
                  <span>P/L {fmtNum(p.pe, 1)}</span>
                  <span>ROE {fmtPct(p.roe)}</span>
                  <span>Yield {fmtPct(p.dividend_yield)}</span>
                  <ScorePill value={p.composite} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-2 font-medium">Ticker</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">P/L</th>
                  <th className="pb-2 font-medium">P/VP</th>
                  <th className="pb-2 font-medium">ROE</th>
                  <th className="pb-2 font-medium">Yield</th>
                  <th className="pb-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((p) => (
                  <tr key={p.ticker} className={`border-t border-line ${p.is_self ? "bg-soft/60" : ""}`}>
                    <td className="py-3 font-mono">
                      {p.is_self ? (
                        p.ticker
                      ) : (
                        <Link className="hover:text-accent" href={`/stocks/${p.ticker}`}>
                          {p.ticker}
                        </Link>
                      )}
                    </td>
                    <td className="py-3 text-muted">{p.name || ""}</td>
                    <td className="py-3 font-mono">{fmtNum(p.pe, 1)}</td>
                    <td className="py-3 font-mono">{fmtNum(p.pb, 1)}</td>
                    <td className="py-3 font-mono">{fmtPct(p.roe)}</td>
                    <td className="py-3 font-mono">{fmtPct(p.dividend_yield)}</td>
                    <td className="py-3">
                      <ScorePill value={p.composite} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </div>
      )}

      {tab === "Risks" && (
        <div className="grid gap-6 lg:grid-cols-2" role="tabpanel">
          <Card>
            <Label>What can go wrong here</Label>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              {analysis.caveat || "Industry multiples are a snapshot, not a target."}
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="border-t border-line pt-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Do profits turn into cash?</div>
                <p className="mt-1 text-muted">
                  {analysis.cash?.ocf_to_earnings != null
                    ? `Operating cash was ${fmtNum(analysis.cash.ocf_to_earnings, 2)}× last year's profit. Above 1 is healthy.`
                    : "Need the company’s cash-flow filing to check this."}
                </p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="inline-flex items-center text-[11px] uppercase tracking-[0.08em] text-faint">
                  Can the dividend last?
                  <InfoTip label="Payout">{GLOSSARY.payout.short}</InfoTip>
                </div>
                <p className="mt-1 text-muted">
                  {analysis.cash?.payout != null
                    ? `The dividend uses about ${fmtPct(analysis.cash.payout, 0)} of earnings. Above 100% means it is paying more than the year earned.`
                    : "Need both yield and P/L for a payout read."}
                </p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="inline-flex items-center text-[11px] uppercase tracking-[0.08em] text-faint">
                  Rates and inflation
                  <InfoTip label="Macro fit">{GLOSSARY.macro_fit.short}</InfoTip>
                </div>
                <p className="mt-1 text-muted">
                  Fit with rates for {data.sector} is{" "}
                  <span className="font-mono text-ink">{data.score?.macro_fit ?? "—"}</span>. Banks like a high Selic;
                  retailers and homebuilders do not. This is a simple check, not a forecast.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <Label hint={GLOSSARY.moat.short}>Why a customer stays (1–10)</Label>
            {data.moat ? (
              <>
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {(
                      [
                        ["Scale", data.moat.scale],
                        ["Regulation", data.moat.regulation],
                        ["Brand", data.moat.brand],
                        ["Cost advantage", data.moat.cost_advantage],
                        ["Switching costs", data.moat.switching_costs],
                        ["Network", data.moat.network],
                      ] as const
                    ).map(([k, v]) => (
                      <tr key={k} className="border-t border-line">
                        <td className="py-3 text-muted">{k}</td>
                        <td className="py-3 text-right font-mono">{v}/10</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <label className="mt-3 block text-[12px] text-muted" htmlFor="moat-note">
                  Your moat note
                </label>
                <textarea
                  id="moat-note"
                  className="mt-1 h-28 w-full border border-line p-3 text-sm"
                  value={moatSummary}
                  onChange={(e) => setMoatSummary(e.target.value)}
                />
                <PrimaryButton
                  className="mt-3"
                  onClick={async () => {
                    await api.putMoat(data.ticker, { summary: moatSummary });
                    const fresh = (await api.stock(ticker)) as Detail;
                    setData(fresh);
                    setFlash("Moat note saved.");
                  }}
                >
                  Save note
                </PrimaryButton>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">No franchise note yet.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "Notes" && (
        <div className="grid gap-6" role="tabpanel">
          <Card>
            <Label>Your thesis</Label>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                ["Best case", bull, setBull],
                ["Base case", base, setBase],
                ["Worst case", bear, setBear],
              ].map(([label, val, set]) => (
                <div key={label as string}>
                  <label className="mb-1 block text-xs text-faint">{label as string}</label>
                  <textarea
                    className="h-28 w-full border border-line p-3 text-sm"
                    value={val as string}
                    onChange={(e) => (set as (v: string) => void)(e.target.value)}
                  />
                </div>
              ))}
            </div>
            <PrimaryButton
              className="mt-3"
              onClick={() =>
                api
                  .putThesis(data.ticker, { bull, base, bear, checklist: {} })
                  .then(() => api.stock(ticker).then((d) => setData(d as Detail)))
                  .then(() => setFlash("Thesis saved."))
              }
            >
              Save thesis
            </PrimaryButton>
          </Card>
          <Card>
            <Label>News</Label>
            <ul className="mt-2 space-y-4">
              {(data.news || []).length === 0 ? (
                <li className="text-sm text-muted">No headlines loaded.</li>
              ) : (
                (data.news || []).map((n, i) => (
                  <li key={i} className="border-t border-line pt-4 first:border-0 first:pt-0">
                    <a href={n.url || "#"} target="_blank" rel="noreferrer" className="hover:text-accent">
                      {n.title}
                    </a>
                    <div className="mt-1 text-xs text-faint">{n.source}</div>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
