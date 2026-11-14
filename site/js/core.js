/* Ações Baratas — state, formatting, shared vocabulary. Data: data/*.json (built daily by pipeline/run.py). */
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const S = {
  stocks: [], meta: {}, series: {}, hist: {}, prices: {}, bySector: {}, byTicker: {},
  market: store.get("market", "BR"), favs: new Set(store.get("favs", [])),
  ex: { q: "", sector: "", verdicts: [], preset: "", sort: ["final_score", -1], shown: 60 },
  map: { preset: "matriz", x: "value_score", y: "quality_score" },
};

// ---------- formatting ----------
const nf = (d) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const NF = [nf(0), nf(1), nf(2)];
const isNum = (v) => typeof v === "number" && isFinite(v);
const x = (v, d = 1) => (isNum(v) ? NF[d].format(v) : "–");
const pct = (v, d = 1) => (isNum(v) ? NF[d].format(v * 100) + "%" : "–");
const spct = (v, d = 0) => (isNum(v) ? (v > 0 ? "+" : "") + pct(v, d) : "–");
const money = (v, cur) => (isNum(v) ? (cur === "USD" ? "US$ " : "R$ ") + NF[2].format(v) : "–");
const big = (v, cur) => {
  if (!isNum(v)) return "–";
  const p = cur === "USD" ? "US$ " : "R$ ", a = Math.abs(v);
  if (a >= 1e12) return p + NF[1].format(v / 1e12) + " tri";
  if (a >= 1e9) return p + NF[1].format(v / 1e9) + " bi";
  if (a >= 1e6) return p + NF[1].format(v / 1e6) + " mi";
  return p + NF[0].format(v);
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const median = (arr) => { const a = arr.filter(isNum).sort((p, q) => p - q); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const quantile = (sorted, q) => { if (!sorted.length) return null; const i = (sorted.length - 1) * q, lo = Math.floor(i); return sorted[lo] + (sorted[Math.min(sorted.length - 1, lo + 1)] - sorted[lo]) * (i - lo); };
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtDate = (d, full) => { const [y, m, dd] = d.split("-"); return full ? `${dd}/${m}/${y}` : `${MES[+m - 1]}/${y.slice(2)}`; };

// ---------- vocabulary ----------
const VERDICTS = {
  oportunidade: { l: "Barata e boa", pl: "baratas e boas", d: "Múltiplos baixos contra o setor, retorno acima do custo de capital, sem alerta grave e a maioria dos sinais a favor." },
  barata_risco: { l: "Barata, com risco", pl: "baratas, com risco", d: "Múltiplos baixos, mas falha em qualidade, dívida ou algum alerta grave. É onde moram as armadilhas de valor." },
  boa_cara: { l: "Boa, mas cara", pl: "boas, mas caras", d: "Empresa de qualidade negociada a múltiplos altos contra o setor." },
  neutra: { l: "Neutra", pl: "neutras", d: "Nem barata nem especialmente boa pelos indicadores." },
  evitar: { l: "Evitar", pl: "para evitar", d: "Cara e fraca, com prejuízo ou com patrimônio negativo." },
};
const VORDER = ["oportunidade", "barata_risco", "boa_cara", "neutra", "evitar"];
const vcolor = (v) => `var(--v-${v})`;
const vdot = (v) => `<i class="vdot${v === "evitar" ? " hollow" : ""}" style="--c:${vcolor(v)}"></i>`;
const pill = (v, bigger) => `<span class="pill${bigger ? " big" : ""}">${vdot(v)}${VERDICTS[v] ? VERDICTS[v].l : ""}</span>`;

const SIGNALS = {
  barata_setor: "Barata contra o setor", rend_lucro: "Lucro rende mais que a renda fixa", graham: "Abaixo do número de Graham",
  pl_normal: "P/L moderado no lucro de 3 anos", rentavel: "Retorno acima do custo de capital", divida: "Dívida sob controle",
  estavel: "Lucro todo ano", caixa: "Lucro vira caixa", dividendos: "Dividendos consistentes", tendencia: "Preço em tendência de alta",
};
const SIG_NEG = {
  barata_setor: "Não está barata contra o setor", rend_lucro: "Lucro rende menos que a renda fixa", graham: "Acima do número de Graham",
  pl_normal: "P/L alto no lucro de 3 anos", rentavel: "Retorno abaixo do custo de capital", divida: "Dívida pesada",
  estavel: "Teve ano de prejuízo", caixa: "Lucro não vira caixa", dividendos: "Dividendos fracos ou irregulares", tendencia: "Preço em tendência de queda",
};
const sigName = (g) => (g[1] === false ? SIG_NEG : SIGNALS)[g[0]];
const SIG_PRIORITY = ["rend_lucro", "rentavel", "barata_setor", "divida", "graham", "estavel", "caixa", "dividendos", "pl_normal", "tendencia"];
const FLAGS = {
  lucro_negativo: ["Prejuízo", "Lucro negativo nos últimos 12 meses: P/L não tem significado.", 1],
  patrimonio_negativo: ["Patrimônio negativo", "A empresa deve mais do que tem.", 1],
  divida_alta: ["Dívida alta", "Dívida líquida acima de 4 vezes o EBITDA.", 1],
  cobertura_baixa: ["Juros pesados", "O lucro operacional cobre os juros menos de 2 vezes.", 1],
  pico_ciclo: ["Pico do ciclo", "Margem atual mais de 30% acima da média de vários anos em setor cíclico: o lucro pode cair.", 1],
  pl_muito_baixo: ["P/L abaixo de 3", "P/L muito baixo costuma vir de lucro não recorrente, como venda de ativo ou crédito fiscal.", 0],
  dy_atipico: ["Dividendo atípico", "Dividend yield acima de 15%: provável pagamento extraordinário ou queda forte do preço.", 0],
  liquidez_corrente_baixa: ["Liquidez curta", "O que entra em 12 meses não cobre o que vence em 12 meses.", 0],
  roe_alavancado: ["ROE inflado", "ROE acima de 60% costuma vir de dívida ou patrimônio pequeno, não de eficiência.", 0],
  receita_caindo: ["Receita caindo", "Receita encolhendo: risco de declínio estrutural.", 0],
  retorno_abaixo_custo: ["Retorno abaixo do custo", "Retorno sobre o capital abaixo do custo de capital (perto de 13% no Brasil e 8% nos EUA). Múltiplo baixo com retorno baixo costuma ser merecido.", 0],
  lucro_sem_caixa: ["Lucro sem caixa", "Em 3 anos, o caixa da operação foi menos da metade do lucro contábil.", 0],
  prejuizo_recente: ["Prejuízo recente", "Teve prejuízo em pelo menos um dos últimos 5 anos.", 0],
  ciclica: ["Cíclica", "Setor cíclico ou de commodity: o lucro atual pode estar no pico do ciclo.", 0],
};
const DIMS = [["valor", "Valor"], ["rentabilidade", "Rentabilidade"], ["seguranca", "Segurança"], ["estabilidade", "Estabilidade"], ["tendencia", "Tendência"]];

// Metrics that can sit on a chart axis. dom = fixed domain; otherwise the 2nd-98th percentile is used and outliers sit on the edge.
const METRICS = {
  value_score: { l: "Valor", hint: "mais barata", f: (v) => x(v, 0), dom: [0, 100] },
  quality_score: { l: "Qualidade", hint: "melhor", f: (v) => x(v, 0), dom: [0, 100] },
  final_score: { l: "Score final", hint: "melhor", f: (v) => x(v, 0), dom: [0, 100] },
  sig: { l: "Sinais a favor", get: (s) => (s.sig_total ? s.sig_ok / s.sig_total : null), f: (v) => pct(v, 0), dom: [0, 1] },
  ey: { l: "Rendimento do lucro operacional (EBIT ÷ valor da firma)", short: "EBIT ÷ EV", get: (s) => (s.ev_ebit > 0 ? 1 / s.ev_ebit : null), f: (v) => pct(v, 0) },
  pe: { l: "P/L", get: (s) => (s.pe > 0 ? s.pe : null), f: (v) => x(v) },
  pe_avg3: { l: "P/L no lucro médio de 3 anos", get: (s) => (s.pe_avg3 > 0 ? s.pe_avg3 : null), f: (v) => x(v) },
  pb: { l: "P/VP", get: (s) => (s.pb > 0 ? s.pb : null), f: (v) => x(v, 2) },
  dy: { l: "Dividend yield", f: (v) => pct(v) },
  roic: { l: "ROIC", f: (v) => pct(v, 0) },
  roe: { l: "ROE", f: (v) => pct(v, 0) },
  ebit_margin: { l: "Margem EBIT", f: (v) => pct(v, 0) },
  net_debt_ebitda: { l: "Dívida líquida ÷ EBITDA", f: (v) => x(v) },
  ret_12m: { l: "Retorno do preço em 12 meses", f: (v) => spct(v) },
  vs_ma200: { l: "Preço contra a média de 200 dias", f: (v) => spct(v) },
  graham_gap: { l: "Desconto para o número de Graham", get: (s) => (s.graham_value > 0 && s.price > 0 ? 1 - s.price / s.graham_value : null), f: (v) => pct(v, 0) },
};
const mget = (key, s) => { const m = METRICS[key]; const v = m.get ? m.get(s) : s[key]; return isNum(v) ? v : null; };

// ---------- data ----------
const inMarket = (list = S.stocks) => (S.market === "ALL" ? list : list.filter((s) => s.market === S.market));
const ret = (s) => (s.is_financial ? s.roe : s.roic);
const peersOf = (s) => { const p = S.bySector[s.market + "|" + s.sector] || []; return p.length >= 5 ? p : S.stocks.filter((v) => v.market === s.market); };
const byScore = (a, b) => (b.final_score || 0) - (a.final_score || 0);
const marketName = () => ({ BR: "brasileiras", US: "americanas", ALL: "" }[S.market]);
const rf = (mkt) => { const m = S.meta.macro || {}; return mkt === "US" ? m.us10y : m.selic; };
const sigOf = (s, id) => (s.signals || []).find((g) => g[0] === id);
const pros = (s, n = 3) => SIG_PRIORITY.map((id) => sigOf(s, id)).filter((g) => g && g[1] === true).slice(0, n);
const cons = (s, n = 2) => {
  const out = Object.keys(FLAGS).filter((f) => (s.flags || []).includes(f) && FLAGS[f][2]).map((f) => [FLAGS[f][0], FLAGS[f][1]]);
  for (const id of SIG_PRIORITY) { const g = sigOf(s, id); if (g && g[1] === false) out.push([SIG_NEG[id], g[2]]); }
  return out.slice(0, n);
};
/** Percentile (0-100, higher = better) of a stock's metric among its peers. */
function pctRank(s, key, dir) {
  const v = mget(key, s); if (v === null) return null;
  const vals = peersOf(s).map((p) => mget(key, p)).filter((q) => q !== null);
  if (vals.length < 3) return null;
  const below = vals.filter((q) => q < v).length + vals.filter((q) => q === v).length / 2;
  const p = (below / vals.length) * 100;
  return dir === "low" ? 100 - p : p;
}

async function load() {
  const get = (u) => fetch(u, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [stocks, meta, hist, series] = await Promise.all([get("data/stocks.json"), get("data/meta.json"), get("data/history.json"), get("data/series.json")]);
  S.stocks = stocks || []; S.meta = meta || {}; S.hist = hist || {}; S.series = series || {};
  for (const s of S.stocks) { (S.bySector[s.market + "|" + s.sector] ||= []).push(s); S.byTicker[s.ticker] = s; }
  if (S.meta.generated_at) $("#stamp").textContent = "Atualizado em " + new Date(S.meta.generated_at).toLocaleString("pt-BR") + ".";
  route();
}

// ---------- tooltip ----------
const tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl);
function showTip(html, ev) {
  tipEl.innerHTML = html; tipEl.style.display = "block";
  const p = ev.touches ? ev.touches[0] : ev, tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  tipEl.style.left = Math.min(window.innerWidth - tw - 8, Math.max(8, p.clientX + 14)) + "px";
  tipEl.style.top = (p.clientY - th - 12 < 8 ? p.clientY + 18 : p.clientY - th - 12) + "px";
}
function hideTip() { tipEl.style.display = "none"; }
const stockTip = (s) => `<b>${esc(s.ticker)}</b> <span class="m">${esc(s.name !== s.ticker ? s.name : "")}</span><br>${VERDICTS[s.verdict].l} · score ${x(s.final_score, 0)}<br>` +
  `Valor ${x(s.value_score, 0)} · Qualidade ${x(s.quality_score, 0)}<br>P/L ${s.pe > 0 ? x(s.pe) : "–"} · DY ${pct(s.dy)} · ${s.is_financial ? "ROE" : "ROIC"} ${pct(ret(s), 0)}<br>` +
  `<span class="m">${s.sig_ok} de ${s.sig_total} sinais a favor · ${esc(s.sector || "")}</span>`;
document.addEventListener("mousemove", (ev) => {
  const t = ev.target.closest && ev.target.closest("[data-tip],[data-st]");
  if (!t) { if (!(ev.target.closest && ev.target.closest("svg.pchart"))) hideTip(); return; }
  if (t.dataset.st) { const s = S.byTicker[t.dataset.st]; if (s) showTip(stockTip(s), ev); return; }
  showTip(t.getAttribute("data-tip"), ev);
});

// ---------- mounting charts that need the container width ----------
let mounts = [];
function mount(id, fn) {
  const el = document.getElementById(id); if (!el) return;
  const draw = () => { el.innerHTML = fn(Math.max(280, el.clientWidth)); };
  draw(); mounts.push(draw);
}
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => mounts.forEach((d) => d()), 150); });
