"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type StockListItem } from "@/lib/api";
import { Card, Disclaimer, Flash, GhostButton, PageHead } from "@/components/ui";
import { TickerList } from "@/components/TickerList";
import { InfoTip } from "@/components/InfoTip";
import { GLOSSARY } from "@/lib/glossary";
import { richListItem, sectors as sectorsFromSnap } from "@/lib/research";
import { getSnapshot } from "@/lib/store";

const initialStocks = getSnapshot().stocks.map(richListItem);
const initialSectors = sectorsFromSnap().sectors;

export default function ScreenerPage() {
  const [sector, setSector] = useState("");
  const [maxPe, setMaxPe] = useState("");
  const [minRoe, setMinRoe] = useState("");
  const [preset, setPreset] = useState("");
  const [rows, setRows] = useState<StockListItem[]>(initialStocks);
  const [sectors, setSectors] = useState<Array<{ sector: string; count: number }>>(initialSectors);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState("");

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
    api.sectors().then((d) => setSectors(d.sectors || [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .screener(query)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [query]);

  function clear() {
    setSector("");
    setMaxPe("");
    setMinRoe("");
    setPreset("");
  }

  async function exportCsv() {
    try {
      const csv = await api.exportScreener(query);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "screener.csv";
      a.click();
      URL.revokeObjectURL(url);
      setFlash("CSV downloaded.");
    } catch {
      setFlash("Could not export CSV.");
    }
  }

  return (
    <div>
      <PageHead
        title="Screener"
        subtitle="Filter every Ibovespa name. Open a company to see each metric against its industry."
      />

      <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap">
        <label className="sr-only" htmlFor="scr-sector">
          Sector
        </label>
        <select
          id="scr-sector"
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s.sector} value={s.sector}>
              {s.sector} ({s.count})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="scr-pe">
          Max price / profit (P/L)
        </label>
        <input
          id="scr-pe"
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          placeholder="Max price/profit (P/L)"
          value={maxPe}
          onChange={(e) => setMaxPe(e.target.value)}
        />
        <label className="sr-only" htmlFor="scr-roe">
          Min return on equity %
        </label>
        <input
          id="scr-roe"
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          placeholder="Min ROE %"
          value={minRoe}
          onChange={(e) => setMinRoe(e.target.value)}
        />
        <label className="sr-only" htmlFor="scr-preset">
          Preset
        </label>
        <select
          id="scr-preset"
          className="border border-line bg-elev px-3 py-2.5 text-sm"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          <option value="">No preset</option>
          <option value="quality">Steady growers (quality)</option>
          <option value="value">Cheap stocks (value)</option>
          <option value="income">Income names (yield)</option>
        </select>
        <GhostButton onClick={clear}>Clear</GhostButton>
        <GhostButton onClick={exportCsv}>Export CSV</GhostButton>
      </div>
      <p className="mb-2 text-[12px] text-muted">
        {preset === "quality" ? "Keeps higher-quality names (ROE and score)." : null}
        {preset === "value" ? "Keeps cheaper names on P/L." : null}
        {preset === "income" ? "Keeps names yielding at least 5%." : null}
      </p>
      <Flash text={flash} />

      <p className="mb-3 inline-flex items-center text-[12px] text-muted">
        {loading ? "Loading…" : `${rows.length} names`}
        <InfoTip label="P/L">{GLOSSARY.pe.short}</InfoTip>
        <InfoTip label="ROE">{GLOSSARY.roe.short}</InfoTip>
      </p>

      <Card pad={false}>
        {loading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : (
          <TickerList rows={rows} empty="No names match these filters. Tap Clear and try again." />
        )}
      </Card>
      <Disclaimer />
    </div>
  );
}
