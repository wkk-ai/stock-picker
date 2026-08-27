"use client";

import Link from "next/link";
import { useState } from "react";
import { api, fmtNum, fmtPct, type StockListItem } from "@/lib/api";
import { BandChip, Card, Disclaimer, Label, PageHead, ScorePill } from "@/components/ui";

export default function ComparePage() {
  const [a, setA] = useState("PETR4");
  const [b, setB] = useState("VALE3");
  const [result, setResult] = useState<{ a: StockListItem; b: StockListItem } | null>(null);

  async function run() {
    setResult(await api.compare(a, b));
  }

  function cell(left?: number | null, right?: number | null, pct = false) {
    const lf = pct ? fmtPct(left) : fmtNum(left);
    const rt = pct ? fmtPct(right) : fmtNum(right);
    return (
      <>
        <td className="py-3 font-mono">{lf}</td>
        <td className="py-3 font-mono">{rt}</td>
      </>
    );
  }

  return (
    <div>
      <PageHead title="Compare" subtitle="Side-by-side snapshot for two tickers." />
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className="border border-line px-3 py-2 text-sm font-mono"
          value={a}
          onChange={(e) => setA(e.target.value.toUpperCase())}
        />
        <input
          className="border border-line px-3 py-2 text-sm font-mono"
          value={b}
          onChange={(e) => setB(e.target.value.toUpperCase())}
        />
        <button className="bg-navy px-4 py-2 text-sm text-white" onClick={run}>
          Compare
        </button>
      </div>

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
                <td className="py-3 text-muted">P/L</td>
                {cell(result.a.pe, result.b.pe)}
              </tr>
              <tr className="border-t border-line">
                <td className="py-3 text-muted">ROE</td>
                {cell(result.a.roe, result.b.roe, true)}
              </tr>
              <tr className="border-t border-line">
                <td className="py-3 text-muted">Score</td>
                <td className="py-3">
                  <ScorePill value={result.a.composite} />
                </td>
                <td className="py-3">
                  <ScorePill value={result.b.composite} />
                </td>
              </tr>
              <tr className="border-t border-line">
                <td className="py-3 text-muted">Band</td>
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
