"use client";

import Link from "next/link";
import { BandChip, ScorePill } from "./ui";
import { fmtNum, fmtPct, type StockListItem } from "@/lib/api";

export function TickerList({
  rows,
  watched,
  empty = "No names match that filter.",
}: {
  rows: StockListItem[];
  watched?: Set<string>;
  empty?: string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => {
          const up = (row.change_percent || 0) >= 0;
          return (
            <li key={row.ticker}>
              <Link href={`/stocks/${row.ticker}`} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-semibold tracking-wide text-white">
                  {row.ticker.slice(0, 4)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[14px] font-medium">{row.ticker}</span>
                    {watched?.has(row.ticker) ? <span className="text-[10px] text-gold">●</span> : null}
                  </span>
                  <span className="block truncate text-[12px] text-muted">{row.name}</span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-[14px]">{fmtNum(row.price)}</span>
                  <span className={`block font-mono text-[12px] ${up ? "text-accent" : "text-down"}`}>
                    {row.change_percent == null
                      ? "—"
                      : `${row.change_percent >= 0 ? "+" : ""}${fmtNum(row.change_percent, 2)}%`}
                  </span>
                </span>
                <ScorePill value={row.composite} />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-muted">
              <th className="px-4 py-2.5 font-medium">Ticker</th>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Sector</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Day</th>
              <th className="px-4 py-2.5 font-medium">P/L</th>
              <th className="px-4 py-2.5 font-medium">ROE</th>
              <th className="px-4 py-2.5 font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ticker} className="border-t border-line">
                <td className="px-4 py-2.5">
                  <Link href={`/stocks/${row.ticker}`} className="font-mono hover:text-accent">
                    {row.ticker}
                  </Link>
                  {watched?.has(row.ticker) ? (
                    <span className="ml-1 text-[10px] text-gold" title="On your watchlist">
                      ●
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-muted">{row.name}</td>
                <td className="px-4 py-2.5 text-muted">{row.sector}</td>
                <td className="px-4 py-2.5 font-mono">{fmtNum(row.price)}</td>
                <td className={`px-4 py-2.5 font-mono ${(row.change_percent || 0) >= 0 ? "text-accent" : "text-down"}`}>
                  {row.change_percent == null
                    ? "—"
                    : `${row.change_percent >= 0 ? "+" : ""}${fmtNum(row.change_percent, 2)}%`}
                </td>
                <td className="px-4 py-2.5 font-mono">{fmtNum(row.pe, 1)}</td>
                <td className="px-4 py-2.5 font-mono">{fmtPct(row.roe)}</td>
                <td className="px-4 py-2.5">
                  <ScorePill value={row.composite} />
                </td>
                <td className="px-4 py-2.5">
                  <BandChip band={row.band} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
