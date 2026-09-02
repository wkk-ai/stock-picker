import { useState } from "react";
import { fmtMetric } from "@/lib/format";
import type { MetricRow } from "@/lib/advisor";
import { KIND_LABEL } from "@/lib/advisor";
import { MISSING_METRICS } from "@/lib/glossary";

function verdictTone(tag?: string) {
  if (tag === "cheap" || tag === "strong") return "bg-soft text-accent";
  if (tag === "expensive" || tag === "weak") return "bg-[#FDF0E7] text-watch";
  if (tag === "na") return "bg-mist text-faint";
  return "bg-mist text-muted";
}

function PeerTrack({
  value,
  industry,
  higherBetter,
}: {
  value?: number | null;
  industry?: number | null;
  higherBetter: boolean;
}) {
  if (value == null || industry == null) return null;
  const max = Math.max(Math.abs(value), Math.abs(industry), 0.0001) * 1.35;
  const vPct = Math.max(4, Math.min(96, (Math.abs(value) / max) * 100));
  const iPct = Math.max(4, Math.min(96, (Math.abs(industry) / max) * 100));
  const good = higherBetter ? value >= industry : value <= industry;
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-mist">
        <div
          className="absolute top-[-5px] h-4 w-0.5 -translate-x-1/2 rounded-full bg-navy/35"
          style={{ left: `${iPct}%` }}
          aria-hidden
        />
        <div
          className={`absolute top-[-3px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white shadow-sm ${good ? "bg-accent" : "bg-watch"}`}
          style={{ left: `${vPct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>This stock {good ? "looks better" : "looks stretched"}</span>
        <span>Peer typical at the tick</span>
      </div>
    </div>
  );
}

function TipButton({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="tap ml-0.5 inline-flex items-center justify-center text-[11px] font-semibold text-muted hover:text-navy"
      aria-label={`About ${label}`}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elev">i</span>
    </button>
  );
}

export function MetricBlock({ metrics }: { metrics: MetricRow[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const groups = new Map<string, MetricRow[]>();
  for (const m of metrics) {
    const list = groups.get(m.kind) || [];
    list.push(m);
    groups.set(m.kind, list);
  }
  const order = ["value", "income", "quality", "growth", "risk", "macro", "fact"];
  return (
    <div className="space-y-8">
      {order.map((kind) => {
        const rows = groups.get(kind);
        if (!rows?.length) return null;
        return (
          <section key={kind}>
            <h3 className="mb-3 text-[13px] font-semibold text-navy">{KIND_LABEL[kind] || kind}</h3>
            <div className="space-y-3">
              {rows.map((m) => {
                const open = openKey === m.key;
                return (
                  <div key={m.key} className="rounded-2xl border border-line bg-mist/60 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 font-medium leading-snug text-ink">
                        {m.label}
                        <TipButton
                          label={m.label}
                          open={open}
                          onToggle={() => setOpenKey(open ? null : m.key)}
                        />
                      </div>
                      <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] ${verdictTone(m.verdict)}`}>
                        {m.verdict_label}
                      </span>
                    </div>
                    {open ? (
                      <p className="mt-2 rounded-2xl bg-navy px-3.5 py-3 text-[13px] font-normal leading-relaxed text-white">
                        {m.plain}
                      </p>
                    ) : null}
                    {m.peer ? (
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.08em] text-faint">This stock</div>
                          <div className="font-mono text-[16px]">{fmtMetric(m.value, m.unit)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Industry</div>
                          <div className="font-mono text-[16px]">{fmtMetric(m.industry, m.unit)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Gap</div>
                          <div className="font-mono text-[16px]">
                            {m.delta_pct == null ? "—" : `${m.delta_pct > 0 ? "+" : ""}${m.delta_pct.toFixed(0)}%`}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 font-mono text-[22px] text-navy">{fmtMetric(m.value, m.unit)}</div>
                    )}
                    {m.peer ? <PeerTrack value={m.value} industry={m.industry} higherBetter={m.higher_better} /> : null}
                    <p className="mt-3 text-sm leading-relaxed text-muted">{m.explain}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function MissingMetrics() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {MISSING_METRICS.map((m) => {
        const open = openKey === m.key;
        return (
          <div key={m.key} className="rounded-2xl border border-dashed border-line px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-ink">
                {m.label}
                <TipButton label={m.label} open={open} onToggle={() => setOpenKey(open ? null : m.key)} />
              </div>
              <span className="shrink-0 rounded-pill bg-mist px-2.5 py-0.5 text-[11px] text-faint">Not in this snapshot</span>
            </div>
            {open ? (
              <p className="mt-2 rounded-2xl bg-navy px-3.5 py-3 text-[13px] leading-relaxed text-white">{m.short}</p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.short}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
