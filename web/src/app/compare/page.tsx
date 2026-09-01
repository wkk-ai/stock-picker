"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtNum, fmtPct, type StockListItem } from "@/lib/api";
import { BandChip, Card, Disclaimer, Flash, Label, PageHead, PrimaryButton, ScorePill } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { GLOSSARY } from "@/lib/glossary";

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

  function cell(left?: number | null, right?: number | null, pct = false) {
    const lf = pct ? fmtPct(left) : fmtNum(left, 1);
    const rt = pct ? fmtPct(right) : fmtNum(right, 1);
    return (
      <>
        <td className="py-3 font-mono">{lf}</td>
        <td className="py-3 font-mono">{rt}</td>
      </>
    );
  }

  return (
    <div>
      <PageHead title="Compare" subtitle="Two tickers side by side — price, cheapness, quality, and the desk score." />
      <div className="mb-6 grid gap-3 sm:flex sm:flex-wrap">
        <label className="sr-only" htmlFor="cmp-a">
          First ticker
        </label>
        <input
          id="cmp-a"
          className="border border-line px-3 py-2.5 font-mono text-sm"
          value={a}
          onChange={(e) => setA(e.target.value.toUpperCase())}
        />
        <label className="sr-only" htmlFor="cmp-b">
          Second ticker
        </label>
        <input
          id="cmp-b"
          className="border border-line px-3 py-2.5 font-mono text-sm"
          value={b}
          onChange={(e) => setB(e.target.value.toUpperCase())}
        />
        <PrimaryButton onClick={run}>Compare</PrimaryButton>
        <GhostSwap
          a={a}
          b={b}
          setA={setA}
          setB={setB}
          onSwap={async (left, right) => {
            try {
              setResult(await api.compare(left, right));
              setFlash("");
            } catch {
              setFlash("Use two Ibovespa tickers, like PETR4 and VALE3.");
            }
          }}
        />
      </div>
      <Flash text={flash} tone="err" />

      {result ? (
        <Card>
          <div className="overflow-x-auto">
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
                  {cell(result.a.price, result.b.price)}
                </tr>
                <tr className="border-t border-line">
                  <td className="py-3 text-muted">
                    <span className="inline-flex items-center">
                      Price / profit (P/L)
                      <InfoTip label="P/L">{GLOSSARY.pe.short}</InfoTip>
                    </span>
                  </td>
                  {cell(result.a.pe, result.b.pe)}
                </tr>
                <tr className="border-t border-line">
                  <td className="py-3 text-muted">
                    <span className="inline-flex items-center">
                      Price / book (P/VP)
                      <InfoTip label="P/VP">{GLOSSARY.pb.short}</InfoTip>
                    </span>
                  </td>
                  {cell(result.a.pb, result.b.pb)}
                </tr>
                <tr className="border-t border-line">
                  <td className="py-3 text-muted">
                    <span className="inline-flex items-center">
                      Return on equity (ROE)
                      <InfoTip label="ROE">{GLOSSARY.roe.short}</InfoTip>
                    </span>
                  </td>
                  {cell(result.a.roe, result.b.roe, true)}
                </tr>
                <tr className="border-t border-line">
                  <td className="py-3 text-muted">Dividend yield</td>
                  {cell(result.a.dividend_yield, result.b.dividend_yield, true)}
                </tr>
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

function GhostSwap({
  a,
  b,
  setA,
  setB,
  onSwap,
}: {
  a: string;
  b: string;
  setA: (v: string) => void;
  setB: (v: string) => void;
  onSwap: (left: string, right: string) => void;
}) {
  return (
    <button
      type="button"
      className="tap border border-line px-4 py-2.5 text-sm"
      onClick={() => {
        setA(b);
        setB(a);
        onSwap(b, a);
      }}
    >
      Swap
    </button>
  );
}
