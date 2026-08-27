"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, fmtNum, fmtPct, type StockListItem } from "@/lib/api";
import { BandChip, Card, Disclaimer, PageHead, ScorePill } from "@/components/ui";

export default function ScreenerPage() {
  const [sector, setSector] = useState("");
  const [maxPe, setMaxPe] = useState("");
  const [minRoe, setMinRoe] = useState("");
  const [preset, setPreset] = useState("");
  const [rows, setRows] = useState<StockListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(
    () => ({
      sector,
      max_pe: maxPe,
      min_roe: minRoe ? String(Number(minRoe) / 100) : "",
      preset,
    }),
    [sector, maxPe, minRoe, preset],
  );

  useEffect(() => {
    setLoading(true);
    api
      .screener(query)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div>
      <PageHead
        title="Screener"
        subtitle="Filter the universe. Presets for quality compounders and deep value."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          <option value="">All sectors</option>
          {["Banks", "Oil & Gas", "Mining", "Industrials", "Consumer", "Retail", "Financial Services", "Paper & Pulp"].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
        <input
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          placeholder="Max P/L"
          value={maxPe}
          onChange={(e) => setMaxPe(e.target.value)}
        />
        <input
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          placeholder="Min ROE %"
          value={minRoe}
          onChange={(e) => setMinRoe(e.target.value)}
        />
        <select
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          <option value="">No preset</option>
          <option value="quality">Quality compounders</option>
          <option value="value">Deep value</option>
        </select>
        <a
          className="border border-line bg-elev px-3 py-2.5 text-sm text-muted hover:text-ink"
          href="/api/export/screener.csv"
        >
          Export CSV
        </a>
      </div>

      <Card>
        {loading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-3 font-medium">Ticker</th>
                <th className="pb-3 font-medium">Sector</th>
                <th className="pb-3 font-medium">P/L</th>
                <th className="pb-3 font-medium">ROE</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Band</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker} className="border-t border-line">
                  <td className="py-4">
                    <Link className="font-mono hover:text-accent" href={`/stocks/${r.ticker}`}>
                      {r.ticker}
                    </Link>
                  </td>
                  <td className="py-4 text-muted">{r.sector}</td>
                  <td className="py-4 font-mono">{fmtNum(r.pe, 1)}</td>
                  <td className="py-4 font-mono">{fmtPct(r.roe)}</td>
                  <td className="py-4">
                    <ScorePill value={r.composite} />
                  </td>
                  <td className="py-4">
                    <BandChip band={r.band} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
      <Disclaimer />
    </div>
  );
}
