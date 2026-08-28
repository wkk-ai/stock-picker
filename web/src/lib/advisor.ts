import { BANK_LIKE, CVM_BY_TICKER, SECTOR_CAVEATS, SECTOR_GROUP } from "@/lib/universe";

export type AdvisorStock = {
  ticker: string;
  name: string;
  sector: string;
  quote?: { price?: number | null; change_percent?: number | null } | null;
  indicators?: Record<string, number | string | null> | null;
  score?: { composite?: number | null; band?: string | null } | null;
  statements?: Array<{
    period: string;
    type?: string;
    account: string;
    value?: number | null;
    source?: string;
  }>;
  cvm_code?: string | null;
};

type UniverseRow = {
  ticker: string;
  name: string;
  sector: string;
  group: string;
  cvm_code: string;
  price: number | null;
  change_percent: number | null;
  composite: number | null;
  band: string | null;
  pe: number | null;
  pb: number | null;
  ev_ebitda: number | null;
  dividend_yield: number | null;
  roe: number | null;
  roic: number | null;
  net_margin: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
  debt_equity: number | null;
  current_ratio: number | null;
};

const METRIC_SPECS = [
  { key: "pe", label: "P/L", plain: "Years of profit you pay for the stock today", unit: "x", higher_better: false, kind: "value", skipBanks: false },
  { key: "pb", label: "P/VP", plain: "Price versus the equity sitting on the books", unit: "x", higher_better: false, kind: "value", skipBanks: false },
  { key: "ev_ebitda", label: "EV/EBITDA", plain: "Enterprise value versus operating cash profit", unit: "x", higher_better: false, kind: "value", skipBanks: true },
  { key: "dividend_yield", label: "Dividend yield", plain: "Cash returned to you as a % of the price", unit: "%", higher_better: true, kind: "income", skipBanks: false },
  { key: "roe", label: "ROE", plain: "Profit the company earns on its own equity", unit: "%", higher_better: true, kind: "quality", skipBanks: false },
  { key: "roic", label: "ROIC", plain: "Return on the capital actually used in the business", unit: "%", higher_better: true, kind: "quality", skipBanks: true },
  { key: "net_margin", label: "Net margin", plain: "How many cents of profit remain from each real of sales", unit: "%", higher_better: true, kind: "quality", skipBanks: true },
  { key: "revenue_growth", label: "Sales growth", plain: "Whether the top line is expanding", unit: "%", higher_better: true, kind: "growth", skipBanks: false },
  { key: "earnings_growth", label: "Profit growth", plain: "Whether last year's profit beat the year before", unit: "%", higher_better: true, kind: "growth", skipBanks: false },
  { key: "debt_equity", label: "Net debt / equity", plain: "How leveraged the balance sheet is", unit: "x", higher_better: false, kind: "risk", skipBanks: true },
  { key: "current_ratio", label: "Current ratio", plain: "Short-term assets versus short-term bills", unit: "x", higher_better: true, kind: "risk", skipBanks: true },
] as const;

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function median(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (clean.length < 2) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function collectUniverse(stocks: AdvisorStock[]): UniverseRow[] {
  return stocks.map((s) => {
    const ind = s.indicators || {};
    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      group: SECTOR_GROUP[s.sector] || "Index",
      cvm_code: String(s.cvm_code || CVM_BY_TICKER[s.ticker] || s.ticker),
      price: num(s.quote?.price),
      change_percent: num(s.quote?.change_percent),
      composite: num(s.score?.composite),
      band: s.score?.band || null,
      pe: num(ind.pe),
      pb: num(ind.pb),
      ev_ebitda: num(ind.ev_ebitda),
      dividend_yield: num(ind.dividend_yield),
      roe: num(ind.roe),
      roic: num(ind.roic),
      net_margin: num(ind.net_margin),
      revenue_growth: num(ind.revenue_growth),
      earnings_growth: num(ind.earnings_growth),
      debt_equity: num(ind.debt_equity),
      current_ratio: num(ind.current_ratio),
    };
  });
}

function scopeRows(universe: UniverseRow[], sector: string) {
  const sectorRows = universe.filter((r) => r.sector === sector);
  if (new Set(sectorRows.map((r) => r.cvm_code)).size >= 3) {
    return { rows: sectorRows, scope: "sector", label: "its industry peers on the Ibovespa" };
  }
  const group = SECTOR_GROUP[sector] || "Index";
  const groupRows = universe.filter((r) => r.group === group);
  if (new Set(groupRows.map((r) => r.cvm_code)).size >= 3) {
    return { rows: groupRows, scope: "group", label: `similar ${group.toLowerCase()} businesses on the Ibovespa` };
  }
  return { rows: universe, scope: "index", label: "the whole Ibovespa" };
}

export function industryMedians(universe: UniverseRow[], sector: string) {
  const packed = scopeRows(universe, sector);
  const byCvm: Record<string, UniverseRow> = {};
  for (const r of packed.rows) byCvm[r.cvm_code] = r;
  const unique = Object.values(byCvm);
  const medians: Record<string, number | null> = {};
  for (const spec of METRIC_SPECS) {
    const sample = spec.kind === "value" ? packed.rows : unique;
    const m = median(sample.map((r) => r[spec.key as keyof UniverseRow] as number | null));
    if (m == null) medians[spec.key] = null;
    else medians[spec.key] = spec.unit === "%" ? Math.round(m * 10000) / 10000 : Math.round(m * 100) / 100;
  }
  return {
    scope: packed.scope,
    label: packed.label,
    peerCount: Math.max(0, unique.length - 1),
    medians,
    rows: packed.rows,
  };
}

function verdict(value: number | null, industry: number | null, higherBetter: boolean) {
  if (value == null || industry == null || industry === 0) {
    return { tag: "na", label: "Not enough industry data", delta: null as number | null };
  }
  const delta = (value - industry) / Math.abs(industry);
  const good = higherBetter ? delta >= 0.12 : delta <= -0.12;
  const bad = higherBetter ? delta <= -0.12 : delta >= 0.12;
  if (good) {
    return { tag: higherBetter ? "strong" : "cheap", label: higherBetter ? "Better than peers" : "Cheaper than peers", delta };
  }
  if (bad) {
    return { tag: higherBetter ? "weak" : "expensive", label: higherBetter ? "Weaker than peers" : "Richer than peers", delta };
  }
  return { tag: "inline", label: "In line with peers", delta };
}

function fmtNum(value: number | null, unit: string) {
  if (value == null) return "—";
  if (unit === "%") return `${(value * 100).toFixed(1)}%`;
  if (unit === "x") return `${value.toFixed(1)}x`;
  return value.toFixed(1);
}

function explain(spec: (typeof METRIC_SPECS)[number], value: number | null, industry: number | null, tag: string) {
  const v = fmtNum(value, spec.unit);
  const i = fmtNum(industry, spec.unit);
  if (tag === "na") {
    if (value == null) return `${spec.plain}. This name has no clean print for this metric (often a loss, or the line does not apply).`;
    return `${spec.plain}. We do not have a clean industry read yet.`;
  }
  if (spec.key === "pe") {
    if (tag === "cheap") return `You pay ${v} of yearly profit here versus ${i} for peers. The stock is cheaper — that can be a bargain or a warning that profits may fall.`;
    if (tag === "expensive") return `You pay ${v} of yearly profit here versus ${i} for peers. The market is asking a premium. That is only fine if growth or quality is clearly better.`;
    return `You pay ${v} of yearly profit, close to the peer typical ${i}.`;
  }
  if (spec.key === "pb") {
    if (tag === "cheap") return `The price is ${v} of book value versus ${i} for peers — a discount to what similar firms fetch.`;
    if (tag === "expensive") return `The price is ${v} of book value versus ${i} for peers. Investors are paying up for the franchise.`;
    return `Book multiple ${v} sits near the peer ${i}.`;
  }
  if (spec.key === "roe") {
    if (tag === "strong") return `The company earned ${v} on its equity. Peers earned about ${i}. This is a more profitable business.`;
    if (tag === "weak") return `The company earned ${v} on its equity versus about ${i} for peers. Returns look softer than the neighborhood.`;
    return `Return on equity ${v} is close to the peer ${i}.`;
  }
  if (spec.key === "dividend_yield") {
    if (tag === "strong") return `The dividend is ${v} of the price versus ${i} for peers. You are being paid more to wait — check that cash can support it.`;
    if (tag === "weak") return `The dividend is ${v} versus ${i} for peers. This name is not the income play in the group.`;
    return `Yield ${v} is near the peer ${i}.`;
  }
  if (spec.key === "debt_equity") {
    if (tag === "cheap" || tag === "strong") return `Leverage is ${v} versus ${i} for peers — a lighter balance sheet.`;
    if (tag === "expensive" || tag === "weak") return `Leverage is ${v} versus ${i} for peers. More debt means less room if the cycle turns.`;
    return `Leverage ${v} is similar to peers at ${i}.`;
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

function buildMetrics(row: UniverseRow, medians: Record<string, number | null>) {
  const out = [];
  for (const spec of METRIC_SPECS) {
    if (spec.skipBanks && BANK_LIKE.has(row.sector)) continue;
    const value = row[spec.key as keyof UniverseRow] as number | null;
    const industry = medians[spec.key] ?? null;
    const v = verdict(value, industry, spec.higher_better);
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
    });
  }
  return out;
}

function impliedPrice(row: UniverseRow, medians: Record<string, number | null>) {
  const price = row.price;
  const pe = row.pe;
  const pb = row.pb;
  const sectorPe = medians.pe ?? null;
  const sectorPb = medians.pb ?? null;
  const atPe = price && pe && sectorPe && pe > 0 ? Math.round(price * (sectorPe / pe) * 100) / 100 : null;
  const atPb = price && pb && sectorPb && pb > 0 ? Math.round(price * (sectorPb / pb) * 100) / 100 : null;
  const bank = BANK_LIKE.has(row.sector);
  const methodPrice = bank && atPb != null ? atPb : atPe;
  const method = bank && atPb != null ? "industry P/VP" : "industry P/L";
  const upside = methodPrice != null && price ? ((methodPrice / price) - 1) * 100 : null;
  const caveat = SECTOR_CAVEATS[row.sector] || "Industry multiples are a snapshot, not a target.";
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
      methodPrice != null && price != null
        ? `If this stock traded at the typical ${method} of its group, the price would be around R$ ${methodPrice.toFixed(2)} instead of R$ ${price.toFixed(2)}.`
        : "Not enough price and multiple data to translate the gap into reais.",
  };
}

function stmtValue(
  rows: NonNullable<AdvisorStock["statements"]>,
  period: string,
  account: string,
): number | null {
  const hit = rows.find((r) => r.period === period && r.account === account && r.value != null);
  return hit?.value ?? null;
}

export function statementTrends(stock: AdvisorStock) {
  const rows = (stock.statements || []).filter((r) => (r.source || "cvm") === "cvm");
  const years = [...new Set(rows.filter((r) => r.period && /^\d{4}$/.test(r.period)).map((r) => r.period))].sort();
  const trends = years.slice(-3).map((y) => {
    const rev = stmtValue(rows, y, "NetRevenue");
    const ni = stmtValue(rows, y, "NetIncome");
    return {
      period: y,
      revenue: rev,
      net_income: ni,
      operating_cf: stmtValue(rows, y, "OperatingCF"),
      equity: stmtValue(rows, y, "Equity"),
      margin: ni != null && rev ? ni / rev : null,
    };
  });
  let cash: number | null = null;
  let note = "Official yearly filings are not on file for this name yet.";
  if (trends.length) {
    const last = trends[trends.length - 1];
    if (last.net_income && last.operating_cf != null) cash = last.operating_cf / last.net_income;
    if (trends.length >= 2) {
      const a = trends[trends.length - 2];
      const b = trends[trends.length - 1];
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
      note = `Latest official year on file is ${trends[trends.length - 1].period}.`;
    }
  }
  return { trends, cash, note };
}

type Metric = ReturnType<typeof buildMetrics>[number];

function stance(metrics: Metric[], cash: number | null, score: number | null) {
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
  if (score != null && score >= 80) {
    return { stance: "Attractive", reason: "The desk score is high versus the rest of the index, with a reasonable industry comparison." };
  }
  if (score != null && score < 50) {
    return { stance: "Avoid", reason: "Too many weak prints versus peers. Wait for a better price or a better business trend." };
  }
  return { stance: "Fair", reason: "Mixed prints versus the group — use the metric table, do not trust a single number." };
}

function bullets(metrics: Metric[], cash: number | null, trendNote: string, caveat: string) {
  const working: string[] = [];
  const catchLines: string[] = [];
  for (const m of metrics) {
    if (["cheap", "strong"].includes(m.verdict) && working.length < 3) {
      working.push(m.explain.includes(" — ") ? m.explain.split(" — ")[0] : m.explain);
    }
    if (["expensive", "weak"].includes(m.verdict) && catchLines.length < 3) {
      catchLines.push(m.explain.includes(" — ") ? m.explain.split(" — ")[0] : m.explain);
    }
  }
  if (cash != null) {
    if (cash >= 1) working.push(`Operating cash was ${cash.toFixed(1)}x accounting profit — the earnings are showing up as cash.`);
    else if (cash < 0.7) catchLines.push(`Operating cash was only ${cash.toFixed(1)}x profit — the reported earnings are not fully turning into cash.`);
  }
  if (!working.length) working.push("No standout edge versus peers on these snapshots.");
  if (!catchLines.length) catchLines.push(caveat);
  return {
    working: working.slice(0, 3),
    catch: catchLines.slice(0, 3),
    watch: [trendNote, "Re-check after the next earnings print; one year never settles an industry comparison."].slice(0, 2),
  };
}

function checklist(metrics: Metric[], cash: number | null, payout: number | null) {
  const pe = metrics.find((m) => m.key === "pe");
  const roe = metrics.find((m) => m.key === "roe");
  const debt = metrics.find((m) => m.key === "debt_equity");
  return [
    {
      key: "cheap",
      label: "Is it cheaper than its industry?",
      ok: Boolean(pe && ["cheap", "inline"].includes(pe.verdict)),
      detail: pe?.explain || "No P/L yet.",
    },
    {
      key: "quality",
      label: "Does it earn more than peers?",
      ok: Boolean(roe && ["strong", "inline"].includes(roe.verdict)),
      detail: roe?.explain || "No ROE yet.",
    },
    {
      key: "balance",
      label: "Is the balance sheet safer than peers?",
      ok: Boolean(!debt || ["cheap", "inline", "strong", "na"].includes(debt.verdict)),
      detail: debt?.explain || "Leverage is not the right lens for this type of company (banks/insurers).",
    },
    {
      key: "cash",
      label: "Do profits turn into cash?",
      ok: cash == null || cash >= 0.7,
      detail:
        cash != null
          ? `Operating cash / profit = ${cash.toFixed(2)}. Above 1 is healthy; below 0.7 needs a reason.`
          : "Cash conversion needs an official cash-flow line.",
    },
    {
      key: "dividend",
      label: "If it pays a dividend, does it look payable?",
      ok: payout == null || payout <= 1.0,
      detail:
        payout != null
          ? `Dividend uses about ${(payout * 100).toFixed(0)}% of earnings. Above 100% means the payout is eating more than the year's profit.`
          : "No clean payout read (need both yield and P/L).",
    },
  ];
}

export function analyzeSnapshotStock(ticker: string, stocks: AdvisorStock[]) {
  const universe = collectUniverse(stocks);
  const selfRow = universe.find((r) => r.ticker === ticker.toUpperCase());
  const stock = stocks.find((s) => s.ticker === ticker.toUpperCase());
  if (!selfRow || !stock) return { stance: "—", metrics: [], peers: [], trends: [], checklist: [] };

  const packed = industryMedians(universe, stock.sector);
  const metrics = buildMetrics(selfRow, packed.medians);
  const { trends, cash, note } = statementTrends(stock);
  const implied = impliedPrice(selfRow, packed.medians);
  const pe = selfRow.pe;
  const dy = selfRow.dividend_yield;
  const payout = dy != null && pe && pe > 0 ? dy * pe : null;
  const st = stance(metrics, cash, selfRow.composite);
  const caveat = SECTOR_CAVEATS[stock.sector] || "";
  const peers = packed.rows
    .map((r) => ({
      ticker: r.ticker,
      name: r.name,
      pe: r.pe,
      pb: r.pb,
      roe: r.roe,
      dividend_yield: r.dividend_yield,
      composite: r.composite,
      is_self: r.ticker === stock.ticker,
    }))
    .sort(
      (a, b) =>
        Number(!a.is_self) - Number(!b.is_self) ||
        Number(a.pe == null) - Number(b.pe == null) ||
        (a.pe || 99) - (b.pe || 99),
    );
  const peMetric = metrics.find((m) => m.key === "pe");
  return {
    stance: st.stance,
    stance_reason: st.reason,
    headline: peMetric?.explain || st.reason,
    summary: `${stock.name} is a ${stock.sector} name. ${st.reason} ${caveat}`,
    bullets: bullets(metrics, cash, note, caveat),
    benchmark_scope: packed.scope,
    benchmark_label: packed.label,
    peer_count: packed.peerCount,
    metrics,
    implied,
    cash: { ocf_to_earnings: cash == null ? null : Math.round(cash * 100) / 100, payout: payout == null ? null : Math.round(payout * 1000) / 1000 },
    trends,
    trend_note: note,
    peers,
    checklist: checklist(metrics, cash, payout),
    caveat,
  };
}
