import { GLOSSARY } from "./glossary";
import { fmtMetric } from "./format";
import { BANK_LIKE, SECTOR_CAVEATS, SECTOR_GROUP } from "./universe";

export type MetricSpec = {
  key: string;
  label: string;
  plain: string;
  unit: "%" | "x" | "R$" | "pp";
  higher_better: boolean;
  kind: "value" | "quality" | "income" | "growth" | "risk" | "macro" | "fact";
  skip_sectors: string[];
  peer: boolean;
};

export type MetricRow = {
  key: string;
  label: string;
  plain: string;
  unit: string;
  value?: number | null;
  industry?: number | null;
  delta_pct?: number | null;
  verdict: string;
  verdict_label: string;
  explain: string;
  higher_better: boolean;
  kind: string;
  peer: boolean;
};

export type UniverseRow = Record<string, unknown> & {
  ticker: string;
  name: string;
  sector: string;
  group: string;
  cvm_code: string;
  price?: number | null;
  change_percent?: number | null;
  composite?: number | null;
  band?: string | null;
};

export const METRIC_SPECS: MetricSpec[] = [
  { key: "pe", label: GLOSSARY.pe.label, plain: GLOSSARY.pe.short, unit: "x", higher_better: false, kind: "value", skip_sectors: [], peer: true },
  { key: "pb", label: GLOSSARY.pb.label, plain: GLOSSARY.pb.short, unit: "x", higher_better: false, kind: "value", skip_sectors: [], peer: true },
  { key: "ev_ebitda", label: GLOSSARY.ev_ebitda.label, plain: GLOSSARY.ev_ebitda.short, unit: "x", higher_better: false, kind: "value", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "ps", label: GLOSSARY.ps.label, plain: GLOSSARY.ps.short, unit: "x", higher_better: false, kind: "value", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "peg", label: GLOSSARY.peg.label, plain: GLOSSARY.peg.short, unit: "x", higher_better: false, kind: "value", skip_sectors: [], peer: true },
  { key: "earnings_yield", label: GLOSSARY.earnings_yield.label, plain: GLOSSARY.earnings_yield.short, unit: "%", higher_better: true, kind: "value", skip_sectors: [], peer: true },
  { key: "earnings_vs_selic", label: GLOSSARY.earnings_vs_selic.label, plain: GLOSSARY.earnings_vs_selic.short, unit: "pp", higher_better: true, kind: "macro", skip_sectors: [], peer: true },
  { key: "dividend_yield", label: GLOSSARY.dividend_yield.label, plain: GLOSSARY.dividend_yield.short, unit: "%", higher_better: true, kind: "income", skip_sectors: [], peer: true },
  { key: "dy_vs_selic", label: GLOSSARY.dy_vs_selic.label, plain: GLOSSARY.dy_vs_selic.short, unit: "pp", higher_better: true, kind: "income", skip_sectors: [], peer: true },
  { key: "payout", label: GLOSSARY.payout.label, plain: GLOSSARY.payout.short, unit: "%", higher_better: false, kind: "income", skip_sectors: [], peer: true },
  { key: "div_coverage", label: GLOSSARY.div_coverage.label, plain: GLOSSARY.div_coverage.short, unit: "x", higher_better: true, kind: "income", skip_sectors: [], peer: true },
  { key: "roe", label: GLOSSARY.roe.label, plain: GLOSSARY.roe.short, unit: "%", higher_better: true, kind: "quality", skip_sectors: [], peer: true },
  { key: "roa", label: GLOSSARY.roa.label, plain: GLOSSARY.roa.short, unit: "%", higher_better: true, kind: "quality", skip_sectors: [], peer: true },
  { key: "roic", label: GLOSSARY.roic.label, plain: GLOSSARY.roic.short, unit: "%", higher_better: true, kind: "quality", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "net_margin", label: GLOSSARY.net_margin.label, plain: GLOSSARY.net_margin.short, unit: "%", higher_better: true, kind: "quality", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "ebitda_margin", label: GLOSSARY.ebitda_margin.label, plain: GLOSSARY.ebitda_margin.short, unit: "%", higher_better: true, kind: "quality", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "asset_turnover", label: GLOSSARY.asset_turnover.label, plain: GLOSSARY.asset_turnover.short, unit: "x", higher_better: true, kind: "quality", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "revenue_growth", label: GLOSSARY.revenue_growth.label, plain: GLOSSARY.revenue_growth.short, unit: "%", higher_better: true, kind: "growth", skip_sectors: [], peer: true },
  { key: "earnings_growth", label: GLOSSARY.earnings_growth.label, plain: GLOSSARY.earnings_growth.short, unit: "%", higher_better: true, kind: "growth", skip_sectors: [], peer: true },
  { key: "debt_equity", label: GLOSSARY.debt_equity.label, plain: GLOSSARY.debt_equity.short, unit: "x", higher_better: false, kind: "risk", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "current_ratio", label: GLOSSARY.current_ratio.label, plain: GLOSSARY.current_ratio.short, unit: "x", higher_better: true, kind: "risk", skip_sectors: [...BANK_LIKE], peer: true },
  { key: "lpa", label: GLOSSARY.lpa.label, plain: GLOSSARY.lpa.short, unit: "R$", higher_better: true, kind: "fact", skip_sectors: [], peer: false },
  { key: "vpa", label: GLOSSARY.vpa.label, plain: GLOSSARY.vpa.short, unit: "R$", higher_better: true, kind: "fact", skip_sectors: [], peer: false },
];

export const KIND_ORDER = ["value", "income", "quality", "growth", "risk", "macro", "fact"] as const;
export const KIND_LABEL: Record<string, string> = {
  value: "Price vs the business",
  income: "Dividends & cash to you",
  quality: "How good the business is",
  growth: "Is it growing?",
  risk: "Balance-sheet safety",
  macro: "Versus Brazil’s interest rate",
  fact: "Per-share facts",
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function enrichDerived(row: UniverseRow, selicPct?: number | null): UniverseRow {
  const pe = num(row.pe);
  const pb = num(row.pb);
  const price = num(row.price);
  const dy = num(row.dividend_yield);
  const eg = num(row.earnings_growth);
  const nm = num(row.net_margin);
  const roa = num(row.roa);
  const selic = selicPct != null ? selicPct / 100 : null;

  if (pe && pe > 0) {
    row.earnings_yield = 1 / pe;
    if (price) row.lpa = price / pe;
    if (dy != null) {
      row.payout = dy * pe;
      if (row.payout) row.div_coverage = 1 / (row.payout as number);
    }
    if (nm != null) row.ps = pe * nm;
    if (selic != null) row.earnings_vs_selic = (row.earnings_yield as number) - selic;
  }
  if (pb && pb > 0 && price) row.vpa = price / pb;
  if (pe && pe > 0 && eg != null && eg > 0.02) row.peg = pe / (eg * 100);
  if (roa != null && nm && nm !== 0) row.asset_turnover = roa / nm;
  if (dy != null && selic != null) row.dy_vs_selic = dy - selic;
  return row;
}

function median(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (clean.length < 2) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function scopeRows(universe: UniverseRow[], sector: string) {
  const sectorRows = universe.filter((r) => r.sector === sector);
  const companies = new Set(sectorRows.map((r) => r.cvm_code));
  if (companies.size >= 3) return { rows: sectorRows, scope: "sector", label: "its industry peers on the Ibovespa" };
  const group = SECTOR_GROUP[sector] || "Index";
  const groupRows = universe.filter((r) => r.group === group);
  const gCompanies = new Set(groupRows.map((r) => r.cvm_code));
  if (gCompanies.size >= 3) return { rows: groupRows, scope: "group", label: `similar ${group.toLowerCase()} businesses on the Ibovespa` };
  return { rows: universe, scope: "index", label: "the whole Ibovespa" };
}

export function industryMedians(universe: UniverseRow[], sector: string, selic?: number | null) {
  const enriched = universe.map((r) => enrichDerived({ ...r }, selic));
  const packed = scopeRows(enriched, sector);
  const byCvm: Record<string, UniverseRow> = {};
  for (const r of packed.rows) byCvm[r.cvm_code] = r;
  const unique = Object.values(byCvm);
  const med: Record<string, number | null> = {};
  for (const spec of METRIC_SPECS) {
    const sample = spec.kind === "value" ? packed.rows : unique;
    const m = median(sample.map((r) => num(r[spec.key])));
    if (m == null) med[spec.key] = null;
    else if (spec.unit === "%" || spec.unit === "pp") med[spec.key] = Math.round(m * 10000) / 10000;
    else med[spec.key] = Math.round(m * 100) / 100;
  }
  return {
    scope: packed.scope,
    label: packed.label,
    peer_count: Math.max(0, unique.length - 1),
    medians: med,
    rows: packed.rows,
  };
}

function verdict(value: number | null, industry: number | null, higherBetter: boolean) {
  if (value == null || industry == null || industry === 0) return { tag: "na", label: "Not enough industry data", delta: null as number | null };
  const delta = (value - industry) / Math.abs(industry);
  const good = higherBetter ? delta >= 0.12 : delta <= -0.12;
  const bad = higherBetter ? delta <= -0.12 : delta >= 0.12;
  if (good) return { tag: higherBetter ? "strong" : "cheap", label: higherBetter ? "Better than peers" : "Cheaper than peers", delta };
  if (bad) return { tag: higherBetter ? "weak" : "expensive", label: higherBetter ? "Weaker than peers" : "Richer than peers", delta };
  return { tag: "inline", label: "In line with peers", delta };
}

function explain(spec: MetricSpec, value: number | null, industry: number | null, tag: string) {
  const v = fmtMetric(value, spec.unit);
  const i = fmtMetric(industry, spec.unit);
  if (tag === "na" || !spec.peer) {
    if (spec.key === "lpa") return `Profit per share is ${v}. This is a fact about this stock, not a peer multiple.`;
    if (spec.key === "vpa") return `Book value per share is ${v}. Price / book (P/VP) is the price divided by this.`;
    return `${spec.plain} We do not have a clean industry read yet.`;
  }
  if (spec.key === "pe") {
    if (tag === "cheap") return `You pay ${v} of yearly profit here versus ${i} for peers. The stock is cheaper — that can be a bargain or a warning that profits may fall.`;
    if (tag === "expensive") return `You pay ${v} of yearly profit here versus ${i} for peers. The market is asking a premium. That is only fine if growth or quality is clearly better.`;
    return `You pay ${v} of yearly profit, close to the peer typical ${i}.`;
  }
  if (spec.key === "earnings_yield") {
    if (tag === "strong") return `Earnings yield is ${v} versus ${i} for peers — you are paid more profit per real of price.`;
    if (tag === "weak") return `Earnings yield is ${v} versus ${i} for peers — you are paid less profit at this price.`;
    return `Earnings yield ${v} sits near the peer ${i}.`;
  }
  if (spec.key === "payout") {
    if (tag === "cheap" || tag === "strong") return `The dividend uses about ${v} of earnings versus ${i} for peers — more room to keep paying.`;
    if (tag === "expensive" || tag === "weak") return `The dividend uses about ${v} of earnings versus ${i} for peers. A high payout can be the business model (utilities) or a stretch.`;
    return `Payout ${v} is close to the peer ${i}.`;
  }
  if (spec.higher_better) {
    if (tag === "strong") return `${spec.label} is ${v} versus ${i} for peers — ahead of the group.`;
    if (tag === "weak") return `${spec.label} is ${v} versus ${i} for peers — behind the group.`;
    return `${spec.label} ${v} is close to the peer ${i}.`;
  }
  if (tag === "cheap") return `${spec.label} is ${v} versus ${i} for peers — lower (usually friendlier) than the group.`;
  if (tag === "expensive") return `${spec.label} is ${v} versus ${i} for peers — higher than the group.`;
  return `${spec.label} ${v} is close to the peer ${i}.`;
}

export function buildMetrics(stockRow: UniverseRow, medians: Record<string, number | null>): MetricRow[] {
  const out: MetricRow[] = [];
  for (const spec of METRIC_SPECS) {
    if (spec.skip_sectors.includes(stockRow.sector)) continue;
    const value = num(stockRow[spec.key]);
    const industry = spec.peer ? (medians[spec.key] ?? null) : null;
    const v = spec.peer ? verdict(value, industry, spec.higher_better) : { tag: "na", label: "Per-share fact", delta: null };
    out.push({
      key: spec.key,
      label: spec.label,
      plain: spec.plain,
      unit: spec.unit,
      value,
      industry,
      delta_pct: v.delta == null ? null : Math.round(v.delta * 1000) / 10,
      verdict: v.tag,
      verdict_label: v.label,
      explain: explain(spec, value, industry, v.tag),
      higher_better: spec.higher_better,
      kind: spec.kind,
      peer: spec.peer,
    });
  }
  return out;
}

function implied(stockRow: UniverseRow, medians: Record<string, number | null>) {
  const price = num(stockRow.price);
  const pe = num(stockRow.pe);
  const pb = num(stockRow.pb);
  const sectorPe = medians.pe ?? null;
  const sectorPb = medians.pb ?? null;
  const atPe = price && pe && sectorPe && pe > 0 ? Math.round(price * (sectorPe / pe) * 100) / 100 : null;
  const atPb = price && pb && sectorPb && pb > 0 ? Math.round(price * (sectorPb / pb) * 100) / 100 : null;
  const bank = BANK_LIKE.has(stockRow.sector);
  const methodPrice = bank && atPb ? atPb : atPe;
  const method = bank && atPb ? "industry P/VP" : "industry P/L";
  const upside = methodPrice && price ? ((methodPrice / price) - 1) * 100 : null;
  const caveat = SECTOR_CAVEATS[stockRow.sector] || "Industry multiples are a snapshot, not a target.";
  return {
    price,
    industry_pe: sectorPe,
    industry_pb: sectorPb,
    at_industry_pe: bank ? null : atPe,
    at_industry_pb: atPb,
    method,
    fairish: methodPrice,
    upside_pct: upside == null ? null : Math.round(upside * 10) / 10,
    caveat,
    explain:
      methodPrice && price
        ? `If this stock traded at the typical ${method} of its group, the price would be around R$ ${methodPrice.toFixed(2)} instead of R$ ${price.toFixed(2)}.`
        : "Not enough price and multiple data to translate the gap into reais.",
  };
}

function stance(metrics: MetricRow[], cash: number | null, score?: number | null) {
  const cheap = metrics.filter((m) => m.verdict === "cheap").length;
  const expensive = metrics.filter((m) => m.verdict === "expensive").length;
  const strong = metrics.filter((m) => m.verdict === "strong").length;
  const weak = metrics.filter((m) => m.verdict === "weak").length;
  const pe = metrics.find((m) => m.key === "pe");
  const roe = metrics.find((m) => m.key === "roe");
  const valueOk = pe && ["cheap", "inline"].includes(pe.verdict);
  const qualityOk = roe && ["strong", "inline"].includes(roe.verdict);
  const cashOk = cash == null || cash >= 0.7;
  if (cheap + strong >= 3 && expensive + weak <= 1 && cashOk && (score || 50) >= 60) {
    return { stance: "Attractive", reason: "Cheaper or better than its group on several checks, with profits that look real enough to study further." };
  }
  if (expensive + weak >= 3 && cheap + strong <= 1) {
    return { stance: "Caution", reason: "The group already looks healthier or cheaper. You need a strong reason to stretch here." };
  }
  if (pe?.verdict === "cheap" && roe?.verdict === "weak") {
    return { stance: "Caution", reason: "It looks cheap, but it also earns less than peers. That mix is often a value trap, not a gift." };
  }
  if (pe?.verdict === "expensive" && qualityOk) {
    return { stance: "Fair", reason: "You pay a premium. That can be fine if the business keeps earning more than its group." };
  }
  if (valueOk && qualityOk) {
    return { stance: "Fair", reason: "Price and quality sit near the group. Nothing screams bargain or danger on these numbers alone." };
  }
  if (score && score >= 80) return { stance: "Attractive", reason: "The desk score is high versus the rest of the index, with a reasonable industry comparison." };
  if (score && score < 50) return { stance: "Avoid", reason: "Too many weak prints versus peers. Wait for a better price or a better business trend." };
  return { stance: "Fair", reason: "Mixed prints versus the group — use the metric table, do not trust a single number." };
}

function bullets(metrics: MetricRow[], cash: number | null, trendNote: string, caveat: string) {
  const working: string[] = [];
  const catchBits: string[] = [];
  for (const m of metrics) {
    if (["cheap", "strong"].includes(m.verdict) && working.length < 3) working.push(m.explain.split(" — ")[0]);
    if (["expensive", "weak"].includes(m.verdict) && catchBits.length < 3) catchBits.push(m.explain.split(" — ")[0]);
  }
  if (cash != null) {
    if (cash >= 1) working.push(`Operating cash was ${cash.toFixed(1)}x accounting profit — the earnings are showing up as cash.`);
    else if (cash < 0.7) catchBits.push(`Operating cash was only ${cash.toFixed(1)}x profit — the reported earnings are not fully turning into cash.`);
  }
  if (!working.length) working.push("No standout edge versus peers on these snapshots.");
  if (!catchBits.length) catchBits.push(caveat);
  return { working: working.slice(0, 3), catch: catchBits.slice(0, 3), watch: [trendNote, "Re-check after the next earnings print; one year never settles an industry comparison."].slice(0, 2) };
}

function checklist(metrics: MetricRow[], cash: number | null, payout: number | null) {
  const pe = metrics.find((m) => m.key === "pe");
  const roe = metrics.find((m) => m.key === "roe");
  const debt = metrics.find((m) => m.key === "debt_equity");
  return [
    { key: "cheap", label: "Is it cheaper than its industry?", ok: !!(pe && ["cheap", "inline"].includes(pe.verdict)), detail: pe?.explain || "No P/L yet." },
    { key: "quality", label: "Does it earn more than peers?", ok: !!(roe && ["strong", "inline"].includes(roe.verdict)), detail: roe?.explain || "No ROE yet." },
    { key: "balance", label: "Is the balance sheet safer than peers?", ok: !debt || ["cheap", "inline", "strong", "na"].includes(debt.verdict), detail: debt?.explain || "Leverage is not the right lens for this type of company (banks/insurers)." },
    {
      key: "cash",
      label: "Do profits turn into cash?",
      ok: cash == null || cash >= 0.7,
      detail: cash != null ? `Operating cash / profit = ${cash.toFixed(2)}. Above 1 is healthy; below 0.7 needs a reason.` : "Cash conversion needs a CVM cash-flow line.",
    },
    {
      key: "dividend",
      label: "If it pays a dividend, does it look payable?",
      ok: payout == null || payout <= 1,
      detail: payout != null ? `The dividend uses about ${(payout * 100).toFixed(0)}% of earnings. Above 100% means the payout is eating more than the year's profit.` : "No clean payout read (need both yield and P/L).",
    },
  ];
}

export type SnapStock = {
  ticker: string;
  name: string;
  sector: string;
  quote?: { price?: number | null; change_percent?: number | null; volume?: number | null; market_cap?: number | null };
  indicators?: Record<string, number | string | null>;
  score?: { composite?: number; band?: string; quality?: number; value?: number; moat?: number; macro_fit?: number; rationale?: string };
  statements?: Array<{ period: string; account: string; value?: number | null; source?: string; type?: string }>;
  cvm_code?: string;
};

function toRow(s: SnapStock): UniverseRow {
  const ind = s.indicators || {};
  return {
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    group: SECTOR_GROUP[s.sector] || "Index",
    cvm_code: s.cvm_code || s.ticker,
    price: s.quote?.price ?? null,
    change_percent: s.quote?.change_percent ?? null,
    composite: s.score?.composite ?? null,
    band: s.score?.band ?? null,
    pe: ind.pe ?? null,
    pb: ind.pb ?? null,
    ev_ebitda: ind.ev_ebitda ?? null,
    dividend_yield: ind.dividend_yield ?? null,
    roe: ind.roe ?? null,
    roa: ind.roa ?? null,
    roic: ind.roic ?? null,
    net_margin: ind.net_margin ?? null,
    ebitda_margin: ind.ebitda_margin ?? null,
    debt_equity: ind.debt_equity ?? null,
    current_ratio: ind.current_ratio ?? null,
    revenue_growth: ind.revenue_growth ?? null,
    earnings_growth: ind.earnings_growth ?? null,
  };
}

function statementTrends(s: SnapStock) {
  const rows = (s.statements || []).filter((r) => r.source === "cvm" || !r.source);
  const years = [...new Set(rows.filter((r) => r.period && /^\d{4}$/.test(r.period)).map((r) => r.period))].sort();
  const value = (period: string, account: string) => rows.find((r) => r.period === period && r.account === account)?.value ?? null;
  const trends = years.slice(-3).map((y) => {
    const rev = value(y, "NetRevenue");
    const ni = value(y, "NetIncome");
    return {
      period: y,
      revenue: rev,
      net_income: ni,
      operating_cf: value(y, "OperatingCF"),
      equity: value(y, "Equity"),
      margin: ni != null && rev ? ni / rev : null,
    };
  });
  let cash: number | null = null;
  let note = "CVM annual filings are not loaded for this name yet.";
  if (trends.length) {
    const last = trends[trends.length - 1];
    if (last.net_income && last.operating_cf != null) cash = last.operating_cf / last.net_income;
    if (trends.length >= 2) {
      const a = trends[trends.length - 2];
      const b = last;
      const bits: string[] = [];
      if (a.revenue && b.revenue) {
        const chg = b.revenue / a.revenue - 1;
        bits.push("sales " + (chg >= 0.03 ? "rose" : chg <= -0.03 ? "fell" : "were roughly flat"));
      }
      if (a.net_income && b.net_income) {
        const chg = b.net_income / a.net_income - 1;
        bits.push("profit " + (chg >= 0.03 ? "rose" : chg <= -0.03 ? "fell" : "was roughly flat"));
      }
      note = bits.length ? `Last two reported years: ${bits.join(" and ")}.` : "Two years of filings are on file.";
    } else {
      note = `Latest CVM year on file is ${last.period}.`;
    }
  }
  return { trends, cash, note };
}

export function analyzeSnapshot(stock: SnapStock, universeStocks: SnapStock[], selic?: number | null) {
  const universe = universeStocks.map(toRow).map((r) => enrichDerived(r, selic));
  const selfRow = universe.find((r) => r.ticker === stock.ticker);
  if (!selfRow) return { stance: "—", metrics: [] as MetricRow[], peers: [] as UniverseRow[] };
  const packed = industryMedians(universe, stock.sector, selic);
  const metrics = buildMetrics(selfRow, packed.medians);
  const { trends, cash, note } = statementTrends(stock);
  const impliedOut = implied(selfRow, packed.medians);
  const pe = num(selfRow.pe);
  const dy = num(selfRow.dividend_yield);
  const payout = dy != null && pe && pe > 0 ? dy * pe : null;
  const call = stance(metrics, cash, num(selfRow.composite));
  const caveat = SECTOR_CAVEATS[stock.sector] || "";
  const peers = packed.rows
    .map((r) => ({
      ticker: r.ticker,
      name: r.name,
      pe: num(r.pe),
      pb: num(r.pb),
      roe: num(r.roe),
      dividend_yield: num(r.dividend_yield),
      composite: num(r.composite),
      is_self: r.ticker === stock.ticker,
    }))
      .sort((a, b) => Number(!a.is_self) - Number(!b.is_self) || Number(a.pe == null) - Number(b.pe == null) || (a.pe || 99) - (b.pe || 99));
  const peMetric = metrics.find((m) => m.key === "pe");
  return {
    stance: call.stance,
    stance_reason: call.reason,
    headline: peMetric?.explain || call.reason,
    summary: `${stock.name} is a ${stock.sector} name. ${call.reason} ${caveat}`,
    bullets: bullets(metrics, cash, note, caveat),
    benchmark_scope: packed.scope,
    benchmark_label: packed.label,
    peer_count: packed.peer_count,
    metrics,
    implied: impliedOut,
    cash: { ocf_to_earnings: cash == null ? null : Math.round(cash * 100) / 100, payout: payout == null ? null : Math.round(payout * 1000) / 1000 },
    trends,
    trend_note: note,
    peers,
    checklist: checklist(metrics, cash, payout),
    caveat,
  };
}
