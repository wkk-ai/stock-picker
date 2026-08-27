"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtNum } from "@/lib/api";
import { Card, Disclaimer, Label, PageHead } from "@/components/ui";

type Pos = {
  ticker: string;
  quantity: number;
  avg_price: number;
  price: number;
  value: number;
  pnl_pct: number;
  weight: number;
  sector: string;
};

export default function PortfolioPage() {
  const [data, setData] = useState<{
    equity: number;
    positions: Pos[];
    allocation: { sector: string; weight: number }[];
    warnings: string[];
    disclaimer?: string;
  } | null>(null);
  const [ticker, setTicker] = useState("ITUB4");
  const [qty, setQty] = useState("100");
  const [avg, setAvg] = useState("30");

  useEffect(() => {
    api.portfolio().then((d) => setData(d as typeof data));
  }, []);

  const load = () => api.portfolio().then((d) => setData(d as typeof data));

  async function add() {
    await api.upsertPortfolio({
      ticker,
      quantity: Number(qty),
      avg_price: Number(avg),
    });
    await load();
  }

  if (!data) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div>
      <PageHead title="Portfolio" subtitle="Manual positions, weights, concentration flags." />

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Label>Equity</Label>
          <div className="font-mono text-[28px]">R$ {fmtNum(data.equity, 0)}</div>
        </Card>
        <Card>
          <Label>Positions</Label>
          <div className="font-mono text-[28px]">{data.positions.length}</div>
        </Card>
        <Card>
          <Label>Top sector</Label>
          <div className="font-display text-xl">
            {data.allocation[0]
              ? `${data.allocation[0].sector} ${fmtNum(data.allocation[0].weight, 0)}%`
              : "—"}
          </div>
        </Card>
        <Card>
          <Label>Warnings</Label>
          <div className="text-sm text-watch">
            {data.warnings.length ? data.warnings.join(" · ") : "None"}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <Label>Add / update position</Label>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            className="border border-line px-3 py-2 text-sm"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ticker"
          />
          <input
            className="border border-line px-3 py-2 text-sm"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Qty"
          />
          <input
            className="border border-line px-3 py-2 text-sm"
            value={avg}
            onChange={(e) => setAvg(e.target.value)}
            placeholder="Avg price"
          />
          <button
            onClick={add}
            className="bg-navy px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
              <tr className="text-left text-muted">
              <th className="pb-3 font-medium">Ticker</th>
              <th className="pb-3 font-medium">Qty</th>
              <th className="pb-3 font-medium">Avg</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">P&L</th>
              <th className="pb-3 font-medium">Weight</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {data.positions.map((p) => (
              <tr key={p.ticker} className="border-t border-line">
                <td className="py-4">
                  <Link href={`/stocks/${p.ticker}`} className="font-mono hover:text-accent">
                    {p.ticker}
                  </Link>
                </td>
                <td className="py-4 font-mono">{fmtNum(p.quantity, 0)}</td>
                <td className="py-4 font-mono">{fmtNum(p.avg_price)}</td>
                <td className="py-4 font-mono">{fmtNum(p.price)}</td>
                <td className={`py-4 font-mono ${p.pnl_pct >= 0 ? "text-accent" : "text-down"}`}>
                  {fmtNum(p.pnl_pct, 1)}%
                </td>
                <td className="py-4 font-mono">{fmtNum(p.weight, 1)}%</td>
                <td className="py-4">
                  <button
                    className="text-xs text-faint hover:text-down"
                    onClick={async () => {
                      await api.deletePortfolio(p.ticker);
                      await load();
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <Disclaimer text={data.disclaimer} />
    </div>
  );
}
