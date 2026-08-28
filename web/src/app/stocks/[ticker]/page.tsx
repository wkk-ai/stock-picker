"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, fmtBRL, fmtNum, fmtPct } from "@/lib/api";
import { BandChip, Card, Disclaimer, Label, PageHead, ScorePill } from "@/components/ui";

type Metric = {
  key: string;
  label: string;
  plain: string;
  unit: string;
  value?: number | null;
  industry?: number | null;
  delta_pct?: number | null;
  verdict: string;
  verdict_label: string;
  explain: string;
  higher_better: boolean;
};

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
  metrics?: Metric[];
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
  quote?: { price?: number; change_percent?: number };
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

function fmtMetric(value?: number | null, unit?: string) {
  if (value == null || Number.isNaN(value)) return "—";
  if (unit === "%") return fmtPct(value);
  if (unit === "x") return `${fmtNum(value, 1)}x`;
  return fmtNum(value, 1);
}

function verdictTone(tag?: string) {
  if (tag === "cheap" || tag === "strong") return "bg-soft text-accent";
  if (tag === "expensive" || tag === "weak") return "bg-[#FDF0E7] text-watch";
  if (tag === "na") return "bg-mist text-faint";
  return "bg-mist text-muted";
}

function stanceTone(stance?: string) {
  if (stance === "Attractive") return "text-accent";
  if (stance === "Avoid") return "text-down";
  if (stance === "Caution") return "text-watch";
  return "text-navy";
}

function CompareBar({
  value,
  industry,
  higherBetter,
}: {
  value?: number | null;
  industry?: number | null;
  higherBetter: boolean;
}) {
  if (value == null || industry == null) return null;
  const max = Math.max(Math.abs(value), Math.abs(industry), 0.0001) * 1.35;
  const vPct = Math.max(3, Math.min(97, (Math.abs(value) / max) * 100));
  const iPct = Math.max(3, Math.min(97, (Math.abs(industry) / max) * 100));
  const good = higherBetter ? value >= industry : value <= industry;
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-mist">
        <div
          className="absolute top-[-3px] h-3.5 w-px -translate-x-1/2 bg-navy/35"
          style={{ left: `${iPct}%` }}
          title="Industry"
        />
        <div
          className={`absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full ${good ? "bg-accent" : "bg-watch"}`}
          style={{ left: `${vPct}%` }}
          title="This stock"
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-faint">
        <span>This stock</span>
        <span>Industry typical</span>
      </div>
    </div>
  );
}

export default function StockPage() {
  const params = useParams();
  const ticker = String(params.ticker || "").toUpperCase();
  const [tab, setTab] = useState<(typeof tabs)[number]>("The call");
  const [data, setData] = useState<Detail | null>(null);
  const [bull, setBull] = useState("");
  const [base, setBase] = useState("");
  const [bear, setBear] = useState("");
  const [moatSummary, setMoatSummary] = useState("");

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
  }, [ticker]);

  if (!data) return <p className="text-muted">Loading {ticker}…</p>;

  const analysis = data.analysis || {};
  const metrics = analysis.metrics || [];
  const bullets = analysis.bullets || {};
  const implied = analysis.implied || {};
  const peers = (analysis.peers && analysis.peers.length ? analysis.peers : data.peers) || [];
  const trends = analysis.trends || [];
  const up = (data.quote?.change_percent || 0) >= 0;

  return (
    <div>
      <PageHead
        title={`${data.ticker} · ${data.name}`}
        subtitle={`${data.sector}${analysis.benchmark_label ? ` · compared with ${analysis.benchmark_label}` : ""}`}
      />

      <div className="mb-5 flex flex-wrap items-end gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2.5 text-[13px] ${
              tab === t ? "font-semibold text-navy border-b-2 border-gold" : "text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          className="ml-auto mb-1 border border-line px-3 py-1.5 text-[13px] text-muted hover:text-ink"
          onClick={() => api.addWatch(data.ticker)}
        >
          + Watchlist
        </button>
      </div>

      {tab === "The call" && (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Card className="animate-fade-up">
            <Label>Advisor take</Label>
            <div className={`mt-1 text-[28px] font-semibold leading-none ${stanceTone(analysis.stance || data.score?.band)}`}>
              {analysis.stance || data.score?.band || "—"}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <BandChip band={data.score?.band} />
              <span className="font-mono text-sm">
                {fmtNum(data.quote?.price)}
                {data.quote?.change_percent != null && (
                  <span className={`ml-2 ${up ? "text-accent" : "text-down"}`}>
                    {up ? "+" : ""}
                    {fmtNum(data.quote.change_percent, 2)}%
                  </span>
                )}
              </span>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-ink">
              {analysis.headline || analysis.stance_reason || "Industry comparison is still loading."}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{analysis.summary}</p>
          </Card>

          <Card>
            <Label>If it traded like its industry</Label>
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
            <Label>Five questions before you size a position</Label>
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
        <div className="grid gap-6">
          <Card>
            <Label>Every metric vs the industry</Label>
            <p className="mt-1 text-[12px] text-faint">
              Compared with {analysis.benchmark_label || "similar Ibovespa names"}
              {analysis.peer_count != null ? ` (${analysis.peer_count} other companies)` : ""}. Green is cheaper or stronger than the typical peer.
            </p>
            {metrics.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No industry sample yet for this name.</p>
            ) : (
              <div className="mt-2">
                {metrics.map((m) => (
                  <div key={m.key} className="border-t border-line py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-ink">{m.label}</div>
                        <div className="text-[12px] text-muted">{m.plain}</div>
                      </div>
                      <span className={`rounded-[4px] px-2 py-0.5 text-[11px] ${verdictTone(m.verdict)}`}>
                        {m.verdict_label}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] text-faint">This stock</div>
                        <div className="font-mono text-[16px]">{fmtMetric(m.value, m.unit)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Industry</div>
                        <div className="font-mono text-[16px]">{fmtMetric(m.industry, m.unit)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Gap</div>
                        <div className="font-mono text-[16px]">
                          {m.delta_pct == null ? "—" : `${m.delta_pct > 0 ? "+" : ""}${fmtNum(m.delta_pct, 0)}%`}
                        </div>
                      </div>
                    </div>
                    <CompareBar value={m.value} industry={m.industry} higherBetter={m.higher_better} />
                    <p className="mt-3 text-sm leading-relaxed text-muted">{m.explain}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <Label>Last reported years</Label>
            <p className="mt-1 text-[12px] text-faint">{analysis.trend_note || "Official CVM annual filings."}</p>
            {trends.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No official yearly filing on file for this name yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
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
            )}
          </Card>

          <Card>
            <Label>Textbook models (use with care)</Label>
            <p className="mt-1 text-[12px] text-faint">
              These are shortcuts, not a target price. The industry comparison above is the better first read.
            </p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[
                  ["At industry P/L", implied.fairish],
                  ["Graham", data.fair_value?.graham],
                  ["Bazin (6% yield)", data.fair_value?.bazin],
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
        <Card>
          <Label>Same industry on the Ibovespa</Label>
          <p className="mt-1 text-[12px] text-faint">
            Sorted by P/L. This stock is highlighted. Banks are compared on P/L, P/VP, ROE and yield — not EV/EBITDA.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
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
      )}

      {tab === "Risks" && (
        <div className="grid gap-6 lg:grid-cols-2">
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
                    : "Need a CVM cash-flow line to check this."}
                </p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Can the dividend last?</div>
                <p className="mt-1 text-muted">
                  {analysis.cash?.payout != null
                    ? `The dividend uses about ${fmtPct(analysis.cash.payout, 0)} of earnings. Above 100% means it is paying more than the year earned.`
                    : "Need both yield and P/L for a payout read."}
                </p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Rates and inflation</div>
                <p className="mt-1 text-muted">
                  Macro fit for {data.sector} is{" "}
                  <span className="font-mono text-ink">{data.score?.macro_fit ?? "—"}</span>. Banks like a high Selic;
                  retailers and homebuilders do not. This is a simple check, not a forecast.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <Label>Why a customer stays (1–10)</Label>
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
                <textarea
                  className="mt-3 h-28 w-full border border-line p-3 text-sm"
                  value={moatSummary}
                  onChange={(e) => setMoatSummary(e.target.value)}
                />
                <button
                  className="mt-3 bg-navy px-4 py-2 text-sm text-white"
                  onClick={async () => {
                    await api.putMoat(data.ticker, { summary: moatSummary });
                    const fresh = (await api.stock(ticker)) as Detail;
                    setData(fresh);
                  }}
                >
                  Save note
                </button>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">No franchise note yet.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "Notes" && (
        <div className="grid gap-6">
          <Card>
            <Label>Your thesis</Label>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                ["Bull", bull, setBull],
                ["Base", base, setBase],
                ["Bear", bear, setBear],
              ].map(([label, val, set]) => (
                <div key={label as string}>
                  <div className="mb-1 text-xs text-faint">{label as string}</div>
                  <textarea
                    className="h-28 w-full border border-line p-3 text-sm"
                    value={val as string}
                    onChange={(e) => (set as (v: string) => void)(e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button
              className="mt-3 bg-navy px-4 py-2 text-sm text-white"
              onClick={() =>
                api
                  .putThesis(data.ticker, { bull, base, bear, checklist: {} })
                  .then(() => api.stock(ticker).then((d) => setData(d as Detail)))
              }
            >
              Save thesis
            </button>
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
