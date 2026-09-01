"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtNum, fmtPct, type StockListItem } from "@/lib/api";
import { BandChip, Card, Disclaimer, Field, Flash, Label, PageHead, PrimaryButton, ScorePill } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { GLOSSARY } from "@/lib/glossary";
import { analyzeTicker } from "@/lib/research";
import { fmtMetric } from "@/lib/format";

const COMPARE_KEYS = [
  { key: "pe", label: GLOSSARY.pe.label, hint: GLOSSARY.pe.short, pct: false },
  { key: "pb", label: GLOSSARY.pb.label, hint: GLOSSARY.pb.short, pct: false },
  { key: "ev_ebitda", label: GLOSSARY.ev_ebitda.label, hint: GLOSSARY.ev_ebitda.short, pct: false },
  { key: "earnings_yield", label: GLOSSARY.earnings_yield.label, hint: GLOSSARY.earnings_yield.short, pct: true },
  { key: "roe", label: GLOSSARY.roe.label, hint: GLOSSARY.roe.short, pct: true },
  { key: "roic", label: GLOSSARY.roic.label, hint: GLOSSARY.roic.short, pct: true },
  { key: "dividend_yield", label: GLOSSARY.dividend_yield.label, hint: GLOSSARY.dividend_yield.short, pct: true },
  { key: "debt_equity", label: GLOSSARY.debt_equity.label, hint: GLOSSARY.debt_equity.short, pct: false },
] as const;

function metricValue(analysis: ReturnType<typeof analyzeTicker>, key: string) {
  return analysis?.metrics?.find((m) => m.key === key)?.value ?? null;
}

export default function ComparePage() {
  const [a, setA] = useState("PETR4");
  const [b, setB] = useState("VALE3");
  const [result, setResult] = useState<{ a: StockListItem; b: StockListItem } | null>(null);
  const [flash, setFlash] = useState("");

  async function run() {
    try {
      setResult(await api.compare(a, b));
      setFlash("");
    } catch {
      setFlash("Use two Ibovespa tickers, like PETR4 and VALE3.");
    }
  }

  useEffect(() => {
    run().catch(() => undefined);
    // first paint compare of the defaults
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const left = result ? analyzeTicker(result.a.ticker) : null;
  const right = result ? analyzeTicker(result.b.ticker) : null;

  return (
    <div>
      <PageHead title="Compare" subtitle="Two tickers side by side — price, cheapness, quality, and the desk score." />
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <Field id="cmp-a" label="First ticker">
          <input
            id="cmp-a"
            className="w-full border border-line px-3 py-2.5 font-mono"
            value={a}
            onChange={(e) => setA(e.target.value.toUpperCase())}
          />
        </Field>
        <Field id="cmp-b" label="Second ticker">
          <input
            id="cmp-b"
            className="w-full border border-line px-3 py-2.5 font-mono"
            value={b}
            onChange={(e) => setB(e.target.value.toUpperCase())}
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={run}>Compare</PrimaryButton>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="tap border border-line px-4 py-2.5 text-sm"
            onClick={() => {
              const leftT = b;
              const rightT = a;
              setA(leftT);
              setB(rightT);
              api
                .compare(leftT, rightT)
                .then(setResult)
                .then(() => setFlash(""))
                .catch(() => setFlash("Use two Ibovespa tickers, like PETR4 and VALE3."));
            }}
          >
            Swap
          </button>
        </div>
      </div>
      <Flash text={flash} tone="err" />

      {result ? (
        <Card>
          <div className="mb-4 grid grid-cols-2 gap-3 md:hidden">
            <Link href={`/stocks/${result.a.ticker}`} className="rounded-2xl bg-mist px-3 py-3 font-mono hover:text-accent">
              {result.a.ticker}
            </Link>
            <Link href={`/stocks/${result.b.ticker}`} className="rounded-2xl bg-mist px-3 py-3 font-mono hover:text-accent">
              {result.b.ticker}
            </Link>
          </div>
          <ul className="space-y-3 md:hidden">
            <li className="rounded-2xl border border-line px-4 py-3">
              <div className="text-[13px] font-medium text-ink">Price</div>
              <div className="mt-2 grid grid-cols-2 gap-3 font-mono text-[15px]">
                <span>{fmtNum(result.a.price)}</span>
                <span>{fmtNum(result.b.price)}</span>
              </div>
            </li>
            {COMPARE_KEYS.map((row) => (
              <li key={row.key} className="rounded-2xl border border-line px-4 py-3">
                <div className="text-[13px] font-medium text-ink">
                  {row.label}
                  <InfoTip label={row.label}>{row.hint}</InfoTip>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 font-mono text-[15px]">
                  <span>{row.pct ? fmtPct(metricValue(left, row.key)) : fmtMetric(metricValue(left, row.key), "x")}</span>
                  <span>{row.pct ? fmtPct(metricValue(right, row.key)) : fmtMetric(metricValue(right, row.key), "x")}</span>
                </div>
              </li>
            ))}
            <li className="rounded-2xl border border-line px-4 py-3">
              <div className="text-[13px] font-medium">Overall score</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <ScorePill value={result.a.composite} />
                <ScorePill value={result.b.composite} />
              </div>
            </li>
            <li className="rounded-2xl border border-line px-4 py-3">
              <div className="text-[13px] font-medium">Verdict band</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <BandChip band={result.a.band} />
                <BandChip band={result.b.band} />
              </div>
            </li>
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-3 font-medium">Metric</th>
                  <th className="pb-3 font-medium">
                    <Link href={`/stocks/${result.a.ticker}`} className="font-mono hover:text-accent">
                      {result.a.ticker}
                    </Link>
                  </th>
                  <th className="pb-3 font-medium">
                    <Link href={`/stocks/${result.b.ticker}`} className="font-mono hover:text-accent">
                      {result.b.ticker}
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="py-3 text-muted">Price</td>
                  <td className="py-3 font-mono">{fmtNum(result.a.price)}</td>
                  <td className="py-3 font-mono">{fmtNum(result.b.price)}</td>
                </tr>
                {COMPARE_KEYS.map((row) => (
                  <tr key={row.key} className="border-t border-line">
                    <td className="py-3 text-muted">
                      <span className="inline-flex items-center">
                        {row.label}
                        <InfoTip label={row.label}>{row.hint}</InfoTip>
                      </span>
                    </td>
                    <td className="py-3 font-mono">
                      {row.pct ? fmtPct(metricValue(left, row.key)) : fmtMetric(metricValue(left, row.key), row.pct ? "%" : "x")}
                    </td>
                    <td className="py-3 font-mono">
                      {row.pct ? fmtPct(metricValue(right, row.key)) : fmtMetric(metricValue(right, row.key), row.pct ? "%" : "x")}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <td className="py-3 text-muted">
                    <span className="inline-flex items-center">
                      Overall score
                      <InfoTip label="Score">{GLOSSARY.score.short}</InfoTip>
                    </span>
                  </td>
                  <td className="py-3">
                    <ScorePill value={result.a.composite} />
                  </td>
                  <td className="py-3">
                    <ScorePill value={result.b.composite} />
                  </td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-3 text-muted">
                    <span className="inline-flex items-center">
                      Verdict band
                      <InfoTip label="Band">{GLOSSARY.band.short}</InfoTip>
                    </span>
                  </td>
                  <td className="py-3">
                    <BandChip band={result.a.band} />
                  </td>
                  <td className="py-3">
                    <BandChip band={result.b.band} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <Label>Pick two tickers and run compare</Label>
        </Card>
      )}
      <Disclaimer />
    </div>
  );
}
