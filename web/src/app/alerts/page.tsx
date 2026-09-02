"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Disclaimer, Field, Flash, Label, PageHead, PrimaryButton, GhostButton } from "@/components/ui";
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field id="al-kind" label="Alert type">
            <select
              id="al-kind"
              className="w-full border border-line px-3 py-2.5"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="price">Price</option>
              <option value="indicator">Metric (e.g. years of profit)</option>
              <option value="filing">Company filing</option>
              <option value="macro">Economy / rates</option>
            </select>
          </Field>
          <Field id="al-ticker" label="Ticker">
            <input
              id="al-ticker"
              className="w-full border border-line px-3 py-2.5"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="PETR4"
            />
          </Field>
          <Field id="al-rule" label="Rule" className="sm:col-span-2">
            <input
              id="al-rule"
              className="w-full border border-line px-3 py-2.5"
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder="PETR4 below 36"
            />
          </Field>
          <Field id="al-th" label="Trigger level">
            <input
              id="al-th"
              className="w-full border border-line px-3 py-2.5"
              inputMode="decimal"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="36"
            />
          </Field>
          <div className="flex items-end">
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
                    className="tap text-[13px] text-down"
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
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field id="selic-delta" label="Selic change (percentage points)" hint={GLOSSARY.selic.short}>
            <input
              id="selic-delta"
              className="w-28 border border-line px-3 py-2.5"
              inputMode="decimal"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
          </Field>
          <GhostButton onClick={() => api.scenario(Number(delta)).then(setScenario)}>Run Selic change</GhostButton>
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
