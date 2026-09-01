"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtNum } from "@/lib/api";
import { Card, Disclaimer, Flash, Label, PageHead, PrimaryButton } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";

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
  const [flash, setFlash] = useState("");
  const [tone, setTone] = useState<"ok" | "err">("ok");

  useEffect(() => {
    api.portfolio().then((d) => setData(d as typeof data));
  }, []);

  const load = () => api.portfolio().then((d) => setData(d as typeof data));

  async function add() {
    const q = Number(qty);
    const p = Number(avg);
    if (!ticker.trim() || !Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p <= 0) {
      setTone("err");
      setFlash("Enter a ticker, a share count, and an average buy price.");
      return;
    }
    try {
      await api.upsertPortfolio({ ticker, quantity: q, avg_price: p });
      await load();
      setTone("ok");
      setFlash(`${ticker.toUpperCase()} saved.`);
    } catch {
      setTone("err");
      setFlash("Unknown ticker — use an Ibovespa code like PETR4.");
    }
  }

  if (!data) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div>
      <PageHead title="Portfolio" subtitle="Your positions, weights, and a warning if one sector is too large." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Label hint="Total reais value of the positions you typed in.">Portfolio value</Label>
          <div className="font-mono text-[28px]">R$ {fmtNum(data.equity, 0)}</div>
        </Card>
        <Card>
          <Label>Positions</Label>
          <div className="font-mono text-[28px]">{data.positions.length}</div>
        </Card>
        <Card>
          <Label>Top sector</Label>
          <div className="text-xl">
            {data.allocation[0]
              ? `${data.allocation[0].sector} ${fmtNum(data.allocation[0].weight, 0)}%`
              : "—"}
          </div>
        </Card>
        <Card>
          <Label hint="A flag when one sector is 35% or more of the wallet.">Warnings</Label>
          <div className="text-sm text-watch">
            {data.warnings.length ? data.warnings.join(" · ") : "None"}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <Label>Add / update position</Label>
        <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap">
          <label className="sr-only" htmlFor="pos-ticker">
            Ticker
          </label>
          <input
            id="pos-ticker"
            className="border border-line px-3 py-2.5 text-sm"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ticker"
          />
          <label className="sr-only" htmlFor="pos-qty">
            Shares
          </label>
          <input
            id="pos-qty"
            className="border border-line px-3 py-2.5 text-sm"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Shares"
          />
          <label className="sr-only" htmlFor="pos-avg">
            Average buy price
          </label>
          <input
            id="pos-avg"
            className="border border-line px-3 py-2.5 text-sm"
            value={avg}
            onChange={(e) => setAvg(e.target.value)}
            placeholder="Average buy price"
          />
          <PrimaryButton onClick={add}>Save</PrimaryButton>
        </div>
        <Flash text={flash} tone={tone} />
      </Card>

      <Card pad={false}>
        {data.positions.length === 0 ? (
          <p className="p-5 text-sm text-muted">No positions yet. Add a ticker, share count, and average price.</p>
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {data.positions.map((p) => (
                <li key={p.ticker} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/stocks/${p.ticker}`} className="font-mono hover:text-accent">
                      {p.ticker}
                    </Link>
                    <span className={`font-mono text-sm ${p.pnl_pct >= 0 ? "text-accent" : "text-down"}`}>
                      {fmtNum(p.pnl_pct, 1)}%
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-muted">
                    {fmtNum(p.quantity, 0)} shares · avg {fmtNum(p.avg_price)} · now {fmtNum(p.price)} · {fmtNum(p.weight, 1)}% of wallet
                  </div>
                  <button
                    className="tap mt-2 text-[13px] text-down"
                    onClick={async () => {
                      if (!window.confirm(`Remove ${p.ticker}?`)) return;
                      await api.deletePortfolio(p.ticker);
                      await load();
                      setFlash(`${p.ticker} removed.`);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="px-4 pb-3 pt-4 font-medium">Ticker</th>
                    <th className="pb-3 pt-4 font-medium">Shares</th>
                    <th className="pb-3 pt-4 font-medium">Avg buy</th>
                    <th className="pb-3 pt-4 font-medium">Price</th>
                    <th className="pb-3 pt-4 font-medium">
                      <span className="inline-flex items-center">
                        Gain / loss
                        <InfoTip label="P&L">Percent you are up or down versus your average buy price.</InfoTip>
                      </span>
                    </th>
                    <th className="pb-3 pt-4 font-medium">Share of portfolio</th>
                    <th className="pb-3 pt-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((p) => (
                    <tr key={p.ticker} className="border-t border-line">
                      <td className="px-4 py-4">
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
                      <td className="py-4 pr-4">
                        <button
                          className="text-[13px] text-faint hover:text-down"
                          onClick={async () => {
                            if (!window.confirm(`Remove ${p.ticker}?`)) return;
                            await api.deletePortfolio(p.ticker);
                            await load();
                            setFlash(`${p.ticker} removed.`);
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
          </>
        )}
      </Card>
      <Disclaimer text={data.disclaimer} />
    </div>
  );
}
