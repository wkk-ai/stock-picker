"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Disclaimer, Label, PageHead } from "@/components/ui";

type Alert = {
  id: number;
  kind: string;
  ticker?: string | null;
  rule: string;
  threshold?: number | null;
  status: string;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kind, setKind] = useState("price");
  const [ticker, setTicker] = useState("PETR4");
  const [rule, setRule] = useState("PETR4 < 36");
  const [threshold, setThreshold] = useState("36");
  const [scenario, setScenario] = useState<Record<string, unknown> | null>(null);
  const [delta, setDelta] = useState("1");

  const load = () => api.alerts().then((a) => setAlerts(a as Alert[]));

  useEffect(() => {
    load();
    api.scenario(1).then(setScenario);
  }, []);

  return (
    <div>
      <PageHead title="Alerts" subtitle="Price, indicator, filings, and macro regime nudges." />

      <Card className="mb-6">
        <Label>New alert</Label>
        <div className="mt-3 flex flex-wrap gap-3">
          <select
            className="border border-line px-3 py-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="price">Price</option>
            <option value="indicator">Indicator</option>
            <option value="filing">Filing</option>
            <option value="macro">Macro</option>
          </select>
          <input
            className="border border-line px-3 py-2 text-sm"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ticker"
          />
          <input
            className="border border-line px-3 py-2 text-sm min-w-[220px]"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            placeholder="Rule text"
          />
          <input
            className="border border-line px-3 py-2 text-sm w-24"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Threshold"
          />
          <button
            className="bg-navy px-4 py-2 text-sm text-white"
            onClick={async () => {
              await api.createAlert({
                kind,
                ticker,
                rule,
                threshold: threshold ? Number(threshold) : null,
              });
              await load();
            }}
          >
            Arm
          </button>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
              <tr className="text-left text-muted">
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Rule</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="py-4 capitalize">{a.kind}</td>
                <td className="py-4 font-mono text-[13px]">{a.rule}</td>
                <td className="py-4">
                  <span
                    className={`rounded-[4px] px-2.5 py-1 text-xs ${
                      a.status === "Triggered" ? "bg-soft text-accent" : "bg-[#FDF0E7] text-watch"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="py-4">
                  <button
                    className="text-xs text-faint hover:text-down"
                    onClick={async () => {
                      await api.deleteAlert(a.id);
                      await load();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Card>
        <Label>Selic scenario (heuristic)</Label>
        <div className="mt-3 flex items-center gap-3">
          <input
            className="w-24 border border-line px-3 py-2 text-sm"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <button
            className="border border-line px-3 py-2 text-sm"
            onClick={() => api.scenario(Number(delta)).then(setScenario)}
          >
            Simulate Δ Selic
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {((scenario?.impacts as Array<{ sector: string; score_nudge: number }>) || []).map((i) => (
            <li key={i.sector} className="flex justify-between border-t border-line py-2">
              <span className="text-muted">{i.sector}</span>
              <span className={`font-mono ${i.score_nudge >= 0 ? "text-accent" : "text-down"}`}>
                {i.score_nudge >= 0 ? "+" : ""}
                {i.score_nudge}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Disclaimer />
    </div>
  );
}
