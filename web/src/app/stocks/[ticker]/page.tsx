"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, fmtBRL, fmtNum, fmtPct } from "@/lib/api";
import { BandChip, Card, Disclaimer, Label, PageHead, ScorePill } from "@/components/ui";

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
  peers?: Array<{ ticker: string; composite?: number; pe?: number }>;
  checklist?: Array<{ key: string; label: string; ok: boolean }>;
  thesis?: { bull: string; base: string; bear: string };
};

const tabs = ["Overview", "Financials", "News", "Moat", "Macro"] as const;

export default function StockPage() {
  const params = useParams();
  const ticker = String(params.ticker || "").toUpperCase();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
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

  const ind = data.indicators || {};

  return (
    <div>
      <PageHead
        title={data.ticker}
        subtitle={`${data.name} · ${data.sector}${data.moat?.summary ? ` · ${data.moat.summary.slice(0, 80)}…` : ""}`}
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

      {tab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="animate-fade-up">
            <Label>Decision score</Label>
            <div className="mt-2 font-mono text-[36px] font-semibold leading-none text-navy">
              {data.score ? Math.round(data.score.composite) : "—"}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <BandChip band={data.score?.band} />
              <span className="font-mono text-sm text-muted">
                {fmtNum(data.quote?.price)}{" "}
                {data.quote?.change_percent != null && (
                  <span className={data.quote.change_percent >= 0 ? "text-accent" : "text-down"}>
                    {data.quote.change_percent >= 0 ? "+" : ""}
                    {fmtNum(data.quote.change_percent, 2)}%
                  </span>
                )}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted">
              Quality {data.score?.quality} · Value {data.score?.value} · Moat {data.score?.moat} · Macro{" "}
              {data.score?.macro_fit}
            </p>
            <p className="mt-2 text-xs text-faint">{data.score?.rationale}</p>
          </Card>

          <Card>
            <Label>Key ratios {ind.source === "cvm" ? "· CVM" : ""}</Label>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[
                  ["P/L", fmtNum(ind.pe as number, 1)],
                  ["P/VP", fmtNum(ind.pb as number, 1)],
                  ["ROE", fmtPct(ind.roe as number)],
                  ["ROIC", fmtPct(ind.roic as number)],
                  ["Div. yield", fmtPct(ind.dividend_yield as number)],
                  ["Debt/Equity", fmtNum(ind.debt_equity as number, 2)],
                ].map(([k, v]) => (
                  <tr key={k as string} className="border-t border-line">
                    <td className="py-3 text-muted">{k}</td>
                    <td className="py-3 text-right font-mono">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <Label>Fair value models</Label>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[
                  ["Graham", data.fair_value?.graham],
                  ["Bazin (6%)", data.fair_value?.bazin],
                  ["PE fair (12x)", data.fair_value?.pe_fair],
                  ["Upside mid", data.fair_value?.upside_pct],
                ].map(([k, v]) => (
                  <tr key={k as string} className="border-t border-line">
                    <td className="py-3 text-muted">{k}</td>
                    <td className="py-3 text-right font-mono">
                      {k === "Upside mid" ? (v != null ? `${fmtNum(v as number, 1)}%` : "—") : fmtNum(v as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <Label>Buy checklist</Label>
            <ul className="mt-3 space-y-2">
              {(data.checklist || []).map((c) => (
                <li key={c.key} className="flex items-center justify-between text-sm border-t border-line py-2">
                  <span className="text-muted">{c.label}</span>
                  <span className={c.ok ? "text-accent" : "text-watch"}>{c.ok ? "Pass" : "Check"}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="lg:col-span-2">
            <Label>Thesis notes</Label>
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
                api.putThesis(data.ticker, { bull, base, bear, checklist: {} }).then(() => api.stock(ticker).then((d) => setData(d as Detail)))
              }
            >
              Save thesis
            </button>
          </Card>

          <Card className="lg:col-span-2">
            <Label>Peers</Label>
            <div className="mt-3 flex flex-wrap gap-3">
              {(data.peers || []).map((p) => (
                <Link
                  key={p.ticker}
                  href={`/stocks/${p.ticker}`}
                  className="border border-line px-3 py-2 text-sm hover:border-accent"
                >
                  <span className="font-mono">{p.ticker}</span>{" "}
                  <ScorePill value={p.composite} />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "Financials" && (
        <Card>
          <Label>Statements</Label>
          <p className="mt-1 text-[12px] text-faint">
            {(data.statements || []).some((s) => s.source === "cvm")
              ? "Official CVM DFP/ITR filings (consolidated when available)."
              : "Sample figures — refresh official data from the home screen."}
          </p>
          {(data.statements || []).length === 0 ? (
            <p className="mt-4 text-sm text-muted">No filings loaded yet.</p>
          ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 font-medium">Period</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Account</th>
                <th className="pb-2 font-medium">Value</th>
                <th className="pb-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {(data.statements || []).map((s, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-3 font-mono">{s.period}</td>
                  <td className="py-3">{s.type}</td>
                  <td className="py-3">{s.account}</td>
                  <td className="py-3 font-mono">{fmtBRL(s.value)}</td>
                  <td className="py-3 text-faint">{s.source === "cvm" ? "CVM" : s.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </Card>
      )}

      {tab === "News" && (
        <Card>
          <ul className="space-y-4">
            {(data.news || []).map((n, i) => (
              <li key={i} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <a href={n.url || "#"} target="_blank" rel="noreferrer" className="hover:text-accent">
                  {n.title}
                </a>
                <div className="mt-1 text-xs text-faint">{n.source}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "Moat" && data.moat && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <Label>Moat dimensions (1–10)</Label>
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
            <div className="mt-4">
              <ScorePill value={data.score?.moat} /> <span className="text-sm text-muted">moat score</span>
            </div>
          </Card>
          <Card>
            <Label>Strategy summary (editable)</Label>
            <textarea
              className="mt-3 h-40 w-full border border-line p-3 text-sm"
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
              Save moat note
            </button>
          </Card>
        </div>
      )}

      {tab === "Macro" && (
        <Card>
          <Label>Macro fit</Label>
          <p className="mt-3 text-sm text-muted max-w-2xl">
            Sector <strong>{data.sector}</strong> has a macro-fit score of{" "}
            <span className="font-mono text-ink">{data.score?.macro_fit}</span>. Banks tend to benefit when
            Selic is high; retail and consumer suffer. Oil/mining lean on FX. This is a transparent heuristic —
            not a forecast.
          </p>
          <Link href="/alerts" className="mt-4 inline-block text-sm text-accent hover:underline">
            Open Selic scenario tool →
          </Link>
        </Card>
      )}

      <Disclaimer />
    </div>
  );
}
