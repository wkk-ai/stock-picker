"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Disclaimer, Flash, Label, PageHead, PrimaryButton, GhostButton } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { GLOSSARY } from "@/lib/glossary";

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
  const [flash, setFlash] = useState("");

  const load = () => api.alerts().then((a) => setAlerts(a as Alert[]));

  useEffect(() => {
    load();
    api.scenario(1).then(setScenario);
  }, []);

  return (
    <div>
      <PageHead title="Alerts" subtitle="Price, metric, filings, and economy/rates nudges. You turn them on here." />

      <Card className="mb-6">
        <Label>New alert</Label>
        <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap">
          <label className="sr-only" htmlFor="al-kind">
            Alert type
          </label>
          <select
            id="al-kind"
            className="border border-line px-3 py-2.5 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="price">Price</option>
            <option value="indicator">Metric (e.g. P/L)</option>
            <option value="filing">Company filing (CVM)</option>
            <option value="macro">Economy / rates</option>
          </select>
          <label className="sr-only" htmlFor="al-ticker">
            Ticker
          </label>
          <input
            id="al-ticker"
            className="border border-line px-3 py-2.5 text-sm"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Ticker"
          />
          <label className="sr-only" htmlFor="al-rule">
            Rule
          </label>
          <input
            id="al-rule"
            className="min-w-[220px] border border-line px-3 py-2.5 text-sm"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            placeholder="Rule text"
          />
          <label className="sr-only" htmlFor="al-th">
            Trigger level
          </label>
          <input
            id="al-th"
            className="w-24 border border-line px-3 py-2.5 text-sm"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Trigger"
          />
          <PrimaryButton
            onClick={async () => {
              await api.createAlert({
                kind,
                ticker,
                rule,
                threshold: threshold ? Number(threshold) : null,
              });
              await load();
              setFlash("Alert turned on.");
            }}
          >
            Turn on
          </PrimaryButton>
        </div>
        <Flash text={flash} />
      </Card>

      <Card className="mb-6" pad={false}>
        {alerts.length === 0 ? (
          <p className="p-5 text-sm text-muted">No alerts yet. Turn one on above.</p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                <div>
                  <div className="capitalize text-muted">{a.kind}</div>
                  <div className="font-mono text-[13px]">{a.rule}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-pill px-2.5 py-1 text-xs ${
                      a.status === "Triggered" ? "bg-soft text-accent" : "bg-[#FDF0E7] text-watch"
                    }`}
                  >
                    {a.status === "Armed" ? "On" : a.status}
                  </span>
                  <button
                    className="tap text-[13px] text-faint hover:text-down"
                    onClick={async () => {
                      if (!window.confirm("Delete this alert?")) return;
                      await api.deleteAlert(a.id);
                      await load();
                      setFlash("Alert deleted.");
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <Label hint="A rough what-if if Brazil’s key rate moves. Not a forecast.">
          What-if: Selic rate change
        </Label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="selic-delta">
            Selic change in percentage points
          </label>
          <input
            id="selic-delta"
            className="w-24 border border-line px-3 py-2.5 text-sm"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <GhostButton onClick={() => api.scenario(Number(delta)).then(setScenario)}>Run Selic change</GhostButton>
          <InfoTip label="Selic">{GLOSSARY.selic.short}</InfoTip>
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
