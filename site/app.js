/* Ações Baratas — static front end. Data: data/stocks.json, data/meta.json, data/history.json (built daily). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const S = { stocks: [], meta: {}, hist: {}, bySector: {}, market: "ALL", sector: "", q: "", noFlags: false, sort: ["final_score", -1], shown: 100 };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  let favs = new Set(store.get("favs", []));
  Object.assign(S, store.get("prefs", {}));
  const savePrefs = () => store.set("prefs", { market: S.market, noFlags: S.noFlags });

  // ---------- formatting ----------
  const nf = (d) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const F = { n0: nf(0), n1: nf(1), n2: nf(2) };
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const x = (v, d = 1) => (isNum(v) ? F["n" + d].format(v) : "–");
  const pct = (v, d = 1) => (isNum(v) ? F["n" + d].format(v * 100) + "%" : "–");
  const money = (v, cur) => (isNum(v) ? (cur === "USD" ? "US$ " : "R$ ") + F.n2.format(v) : "–");
  const big = (v, cur) => {
    if (!isNum(v)) return "–";
    const p = cur === "USD" ? "US$ " : "R$ ";
    const a = Math.abs(v);
    if (a >= 1e12) return p + F.n1.format(v / 1e12) + " tri";
    if (a >= 1e9) return p + F.n1.format(v / 1e9) + " bi";
    if (a >= 1e6) return p + F.n1.format(v / 1e6) + " mi";
    return p + F.n0.format(v);
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const median = (arr) => { const a = arr.filter(isNum).sort((p, q) => p - q); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

  const FLAGS = {
    lucro_negativo: ["Prejuízo", "Lucro negativo nos últimos 12 meses: P/L não tem significado.", 1],
    pl_muito_baixo: ["P/L < 3", "P/L muito baixo costuma vir de lucro não recorrente (venda de ativo, crédito fiscal).", 0],
    dy_atipico: ["DY > 15%", "Dividend yield atípico: provável dividendo extraordinário ou queda forte do preço.", 0],
    divida_alta: ["Dívida alta", "Dívida líquida acima de 4x o EBITDA.", 1],
    liquidez_corrente_baixa: ["Liquidez < 1", "Ativo circulante menor que passivo circulante.", 0],
    roe_alavancado: ["ROE > 60%", "ROE muito alto pode vir de patrimônio pequeno ou alavancagem, não de eficiência.", 0],
    patrimonio_negativo: ["PL negativo", "Patrimônio líquido negativo.", 1],
    receita_caindo: ["Receita caindo", "Receita encolhendo: risco de armadilha de valor (declínio estrutural).", 0],
    retorno_abaixo_custo: ["Retorno < custo", "ROIC (ou ROE em bancos) abaixo do custo de capital aproximado (13% Brasil, 8% EUA). Múltiplo baixo com retorno baixo costuma ser merecido, não barganha.", 0],
    cobertura_baixa: ["Juros pesados", "Lucro operacional cobre os juros menos de 2 vezes (McKinsey: insustentável).", 1],
    lucro_sem_caixa: ["Lucro sem caixa", "Nos últimos 3 anos, o caixa da operação foi menos da metade do lucro contábil.", 0],
    pico_ciclo: ["Pico do ciclo", "Margem atual mais de 30% acima da média de vários anos em setor cíclico: o lucro pode cair.", 1],
    prejuizo_recente: ["Prejuízo recente", "Teve prejuízo em pelo menos um dos últimos 5 anos (Graham pede 10 anos de lucro).", 0],
    ciclica: ["Cíclica", "Setor cíclico/commodity: lucro atual pode estar no pico do ciclo.", 0],
  };
  const flagHtml = (f) => (f || []).map((k) => { const d = FLAGS[k]; return d ? `<span class="flag ${d[2] ? "red" : ""}" title="${esc(d[1])}">${esc(d[0])}</span>` : ""; }).join("");

  const ret = (s) => (s.is_financial ? s.roe : s.roic);
  const upside = (s) => (isNum(s.graham_value) && isNum(s.price) && s.price > 0 ? s.graham_value / s.price - 1 : null);

  // ---------- data ----------
  async function load() {
    const get = (u) => fetch(u, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [stocks, meta, hist, series] = await Promise.all([get("data/stocks.json"), get("data/meta.json"), get("data/history.json"), get("data/series.json")]);
    S.stocks = stocks || [];
    S.meta = meta || {};
    S.hist = hist || {};
    S.series = series || {};
    for (const s of S.stocks) (S.bySector[s.market + "|" + s.sector] ||= []).push(s);
    renderMacro();
    route();
  }

  function renderMacro() {
    const m = S.meta.macro || {};
    const chips = [];
    if (isNum(m.selic)) chips.push(`<span class="chip">Selic <b>${pct(m.selic, 2)}</b></span>`);
    if (isNum(m.ipca_12m)) chips.push(`<span class="chip">IPCA 12m <b>${pct(m.ipca_12m, 2)}</b></span>`);
    if (isNum(m.us10y)) chips.push(`<span class="chip">Treasury 10a <b>${pct(m.us10y, 2)}</b></span>`);
    if (S.meta.date) chips.push(`<span class="chip">Dados de <b>${new Date(S.meta.date + "T12:00:00").toLocaleDateString("pt-BR")}</b></span>`);
    $("#macro").innerHTML = chips.join("");
    if (S.meta.generated_at) $("#stamp").textContent = "Atualizado em " + new Date(S.meta.generated_at).toLocaleString("pt-BR") + ".";
  }

  // ---------- filtering ----------
  function filtered(list = S.stocks) {
    const q = S.q.trim().toLowerCase();
    return list.filter((s) =>
      (S.market === "ALL" || s.market === S.market) &&
      (!S.sector || s.sector === S.sector) &&
      (!S.noFlags || !(s.flags || []).some((f) => FLAGS[f] && FLAGS[f][2])) &&
      (!q || s.ticker.toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q)));
  }
  function sortList(list, key, dir) {
    const v = (s) => (key === "ret" ? ret(s) : key === "upside" ? upside(s) : s[key]);
    return list.slice().sort((a, b) => {
      const A = v(a), B = v(b);
      if (typeof A === "string" || typeof B === "string") return dir * String(A ?? "").localeCompare(String(B ?? ""));
      const an = isNum(A), bn = isNum(B);
      if (!an && !bn) return 0; if (!an) return 1; if (!bn) return -1;
      return dir * (A - B);
    });
  }

  // ---------- views ----------
  const COLS = [
    ["", "fav", "l"], ["Ação", "ticker", "l"], ["Setor", "sector", "l hide-sm"], ["Preço", "price"], ["Score", "final_score"],
    ["Valor", "value_score", "hide-sm"], ["Qualid.", "quality_score", "hide-sm"], ["P/L", "pe"], ["P/VP", "pb"],
    ["EV/EBIT", "ev_ebit", "hide-sm"], ["DY", "dy"], ["ROIC/ROE", "ret", "hide-sm"], ["Graham", "upside", "hide-sm"], ["Alertas", "flags", "l hide-sm"],
  ];
  function row(s, i) {
    const up = upside(s);
    return `<tr data-t="${esc(s.ticker)}">
      <td class="l"><button class="star ${favs.has(s.ticker) ? "on" : ""}" data-star="${esc(s.ticker)}" aria-label="Favoritar">${favs.has(s.ticker) ? "★" : "☆"}</button></td>
      <td class="l"><span class="tk">${esc(s.ticker)}</span><span class="mk">${s.market}</span><span class="nm">${esc(s.name !== s.ticker ? s.name : "")}</span></td>
      <td class="l hide-sm dim">${esc(s.sector || "")}</td>
      <td class="num">${money(s.price, s.currency)}</td>
      <td><span class="score"><span class="num">${x(s.final_score, 0)}</span><span class="bar"><i style="width:${Math.max(0, Math.min(100, s.final_score || 0))}%"></i></span></span></td>
      <td class="num hide-sm">${x(s.value_score, 0)}</td>
      <td class="num hide-sm">${x(s.quality_score, 0)}</td>
      <td class="num">${isNum(s.pe) && s.pe > 0 ? x(s.pe) : "–"}</td>
      <td class="num">${isNum(s.pb) && s.pb > 0 ? x(s.pb, 2) : "–"}</td>
      <td class="num hide-sm">${s.is_financial ? "–" : isNum(s.ev_ebit) && s.ev_ebit > 0 ? x(s.ev_ebit) : "–"}</td>
      <td class="num">${pct(s.dy)}</td>
      <td class="num hide-sm">${pct(ret(s))}</td>
      <td class="num hide-sm ${isNum(up) ? (up > 0 ? "pos" : "neg") : ""}">${isNum(up) ? (up > 0 ? "+" : "") + pct(up, 0) : "–"}</td>
      <td class="l hide-sm flags">${flagHtml(s.flags)}</td></tr>`;
  }
  function table(list, opts = {}) {
    const [k, d] = S.sort;
    const head = COLS.map(([t, key, cls]) => `<th class="${cls || ""} ${k === key ? "sorted" : ""}" data-sort="${key}">${t}${k === key ? (d < 0 ? " ↓" : " ↑") : ""}</th>`).join("");
    const shown = opts.all ? list : list.slice(0, S.shown);
    return `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${shown.map(row).join("")}</tbody></table></div>
      ${!opts.all && list.length > S.shown ? `<button class="btn more" data-more>Mostrar mais (${list.length - S.shown})</button>` : ""}
      ${!list.length ? `<p class="sub" style="padding:20px">Nada encontrado com esses filtros.</p>` : ""}`;
  }
  function controls(withSector = true) {
    const sectors = [...new Set(S.stocks.filter((s) => S.market === "ALL" || s.market === S.market).map((s) => s.sector))].filter(Boolean).sort();
    return `<div class="controls">
      <div class="seg" role="tablist">${[["ALL", "Todos"], ["BR", "Brasil"], ["US", "EUA"]].map(([v, t]) => `<button data-mkt="${v}" class="${S.market === v ? "on" : ""}">${t}</button>`).join("")}</div>
      <input type="search" id="q" placeholder="Buscar ticker ou empresa" value="${esc(S.q)}">
      ${withSector ? `<select id="sector"><option value="">Todos os setores</option>${sectors.map((s) => `<option ${s === S.sector ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>` : ""}
      <label class="check"><input type="checkbox" id="noflags" ${S.noFlags ? "checked" : ""}> Ocultar alertas graves</label>
      <span class="spacer"></span><span class="count" id="count"></span></div>`;
  }

  function viewRanking() {
    const list = sortList(filtered(), ...S.sort);
    const mk = S.market === "ALL" ? S.stocks : S.stocks.filter((s) => s.market === S.market);
    const top = list[0];
    const gp = mk.filter((s) => s.graham_pass).length;
    const medScore = median(mk.map((s) => s.final_score));
    app.innerHTML = `<h1>Ranking de ações baratas</h1>
      <p class="sub">Score = 60% valor (múltiplos vs. pares do setor) + 40% qualidade, menos penalidades por alertas. Clique numa ação para ver o porquê.</p>
      <div class="kpis">
        <div class="card kpi"><div class="label">Ações analisadas</div><div class="value num">${F.n0.format(mk.length)}</div><div class="hint">${S.meta.counts ? `${S.meta.counts.BR || 0} Brasil · ${S.meta.counts.US || 0} EUA` : ""}</div></div>
        <div class="card kpi"><div class="label">Maior score</div><div class="value">${top ? esc(top.ticker) : "–"}</div><div class="hint">${top ? "score " + x(top.final_score, 0) : ""}</div></div>
        <div class="card kpi"><div class="label">Passam no filtro de Graham</div><div class="value num">${gp}</div><div class="hint">P/L ≤ 15 e P/L × P/VP ≤ 22,5</div></div>
        <div class="card kpi"><div class="label">Score mediano</div><div class="value num">${x(medScore, 0)}</div><div class="hint">de 0 a 100</div></div>
      </div>
      ${controls()}${table(list)}`;
    $("#count").textContent = `${list.length} ações`;
  }

  const STRATS = {
    graham: { t: "Graham (investidor defensivo)", d: "Os 7 testes do capítulo 14: porte grande, balanço forte, lucro em 10 anos, dividendos em 10 anos, lucro crescendo 1/3 em 10 anos, P/L ≤ 15 sobre o lucro médio de 3 anos e P/L × P/VP ≤ 22,5. Entra quem passa em todos menos no máximo um (com dados de pelo menos 6 testes).", f: (s) => s.graham_pass, sort: ["graham_score", -1] },
    graham_ent: { t: "Graham (investidor empreendedor)", d: "Filtro do capítulo 15 de O Investidor Inteligente: P/L ≤ 9, P/VP ≤ 1,2, paga algum dividendo, tem lucro e liquidez corrente ≥ 1,5 (não financeiras). Graham recomenda comprar um grupo diversificado, não uma ação isolada.", f: (s) => s.graham_ent, sort: ["final_score", -1] },
    netnet: { t: "Net-net (Graham)", d: "Preço abaixo do capital de giro líquido (ativo circulante menos todo o passivo). Graham comprava a até 2/3 desse valor, sempre em grupo de muitas ações e excluindo empresas com prejuízo. Só Brasil (dado do Fundamentus).", f: (s) => s.net_net, sort: ["p_ncav", 1] },
    magic: { t: "Fórmula Mágica (Greenblatt)", d: "Combina EV/EBIT baixo (barata) com ROIC alto (boa empresa). Exclui bancos, seguradoras e utilities. Ranking separado por mercado.", f: (s) => isNum(s.magic_rank), sort: ["magic_rank", 1] },
    bazin: { t: "Dividendos (Bazin)", d: "Preço-teto = dividendo dos últimos 12 meses ÷ 6%. Mostra ações abaixo do preço-teto, sem DY atípico (> 15%).", f: (s) => isNum(s.bazin_price) && s.price < s.bazin_price && !(s.flags || []).includes("dy_atipico"), sort: ["dy", -1] },
    value: { t: "Valor puro", d: "Só a parte de valor do score (múltiplos vs. setor), sem olhar qualidade. Útil para achar candidatas, mas confira os alertas: é onde moram as armadilhas de valor.", f: () => true, sort: ["value_score", -1] },
  };
  function viewStrategies(key) {
    key = STRATS[key] ? key : "graham";
    const st = STRATS[key];
    if (S._strat !== key) { S.sort = st.sort; S._strat = key; S.shown = 100; }
    const list = sortList(filtered().filter(st.f), ...S.sort);
    app.innerHTML = `<h1>Estratégias</h1><p class="sub">Métodos clássicos de value investing aplicados aos dados de hoje.</p>
      <div class="controls"><div class="seg">${Object.entries(STRATS).map(([k, v]) => `<button data-strat="${k}" class="${k === key ? "on" : ""}">${v.t.replace("investidor ", "").replace(/^(.*) \((.*)\)$/, (m, a, b) => (a === "Graham" ? "Graham " + b : a))}</button>`).join("")}</div></div>
      <div class="card" style="margin-bottom:14px"><h2>${esc(st.t)}</h2><p class="note" style="margin:0">${esc(st.d)}</p></div>
      ${controls()}${table(list)}`;
    $("#count").textContent = `${list.length} ações`;
  }

  function viewSectors() {
    const rows = Object.entries(S.bySector)
      .filter(([k]) => S.market === "ALL" || k.startsWith(S.market + "|"))
      .map(([k, arr]) => ({ mkt: k.split("|")[0], sector: k.split("|")[1], n: arr.length, score: median(arr.map((s) => s.final_score)), pe: median(arr.map((s) => (s.pe > 0 ? s.pe : null))), pb: median(arr.map((s) => (s.pb > 0 ? s.pb : null))), dy: median(arr.map((s) => s.dy)), ret: median(arr.map(ret)), best: arr.slice().sort((a, b) => (b.final_score || 0) - (a.final_score || 0))[0] }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    app.innerHTML = `<h1>Setores</h1><p class="sub">Medianas por setor. Uma ação só é "barata" de verdade quando comparada com pares do mesmo setor.</p>
      ${controls(false)}
      <div class="tablewrap"><table><thead><tr><th class="l">Setor</th><th>Ações</th><th>Score mediano</th><th>P/L</th><th>P/VP</th><th>DY</th><th class="hide-sm">ROIC/ROE</th><th class="l">Melhor score</th></tr></thead><tbody>
      ${rows.map((r) => `<tr data-sector="${esc(r.sector)}" data-smkt="${r.mkt}"><td class="l"><span class="tk">${esc(r.sector)}</span><span class="mk">${r.mkt}</span></td><td class="num">${r.n}</td><td class="num">${x(r.score, 0)}</td><td class="num">${x(r.pe)}</td><td class="num">${x(r.pb, 2)}</td><td class="num">${pct(r.dy)}</td><td class="num hide-sm">${pct(r.ret)}</td><td class="l"><a href="#/acao/${esc(r.best.ticker)}">${esc(r.best.ticker)}</a> <span class="dim num">${x(r.best.final_score, 0)}</span></td></tr>`).join("")}
      </tbody></table></div>`;
    $("#count").textContent = `${rows.length} setores`;
  }

  function viewFavs() {
    const list = sortList(S.stocks.filter((s) => favs.has(s.ticker)), ...S.sort);
    app.innerHTML = `<h1>Favoritos</h1><p class="sub">Toque na estrela de uma ação para acompanhar aqui. Fica salvo só neste navegador.</p>
      ${list.length ? table(list, { all: true }) : `<div class="card"><p class="sub" style="margin:0">Nenhuma ação favoritada ainda.</p></div>`}`;
  }

  function spark(h) {
    const pts = (h || []).filter((p) => isNum(p[1]));
    if (pts.length < 2) return `<p class="note">Histórico aparece depois de alguns dias de coleta.</p>`;
    const w = 300, ht = 80, n = pts.length;
    const path = pts.map((p, i) => `${i ? "L" : "M"}${(i / (n - 1)) * w},${ht - (p[1] / 100) * ht}`).join(" ");
    return `<svg class="spark" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="var(--bar)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
      <p class="note">Score de ${pts[0][0].split("-").reverse().join("/")} a ${pts[n - 1][0].split("-").reverse().join("/")}</p>`;
  }

  const G_TESTS = [
    ["Porte", "Entre o terço maior do mercado em valor"],
    ["Balanço forte", "Liquidez corrente ≥ 2 e dívida longa ≤ capital de giro (energia: dívida ≤ 2× patrimônio)"],
    ["Lucro estável", "Nenhum prejuízo nos últimos 10 anos"],
    ["Dividendos", "Pagou dividendo em todos os anos do histórico"],
    ["Crescimento", "Lucro médio dos últimos 3 anos ≥ 1/3 maior que 10 anos antes"],
    ["P/L moderado", "Preço ≤ 15× o lucro médio de 3 anos"],
    ["P/VP moderado", "P/VP ≤ 1,5 ou P/L × P/VP ≤ 22,5"],
  ];
  function grahamCard(s) {
    const cs = s.graham_checks || [];
    if (!cs.length) return "";
    const icon = { ok: '<span class="gk ok">✓</span>', fail: '<span class="gk no">✕</span>', na: '<span class="gk na">–</span>' };
    return `<div class="card"><h2>Checklist de Graham <span class="dim num">${s.graham_score}/${s.graham_total}</span></h2>
      <ul class="glist">${G_TESTS.map(([t, d], i) => `<li>${icon[cs[i]] || icon.na}<div><b>${t}</b><span class="note">${d}</span></div></li>`).join("")}</ul>
      <p class="note">Investidor defensivo, O Investidor Inteligente cap. 14. "–" = sem dado ou não se aplica.</p></div>`;
  }
  function niChart(rows, cur) {
    const pts = (rows || []).filter((r) => isNum(r[1]));
    if (pts.length < 2) return `<p class="note">Sem histórico de balanços ainda para esta ação.</p>`;
    const w = 320, h = 120, pad = 14, n = pts.length, bw = (w - pad * 2) / n;
    const vals = pts.map((r) => r[1]);
    const mx = Math.max(...vals, 0), mn = Math.min(...vals, 0), span = mx - mn || 1;
    const y0 = pad + ((mx - 0) / span) * (h - pad * 2);
    const bars = pts.map((r, i) => {
      const v = r[1], y = pad + ((mx - Math.max(v, 0)) / span) * (h - pad * 2), hh = Math.max(1, (Math.abs(v) / span) * (h - pad * 2));
      return `<rect x="${pad + i * bw + 2}" y="${v >= 0 ? y : y0}" width="${bw - 4}" height="${hh}" rx="2" fill="${v >= 0 ? "var(--bar)" : "var(--bad)"}"><title>${r[0]}: ${big(v, cur)}</title></rect>`;
    }).join("");
    const labels = pts.map((r, i) => (i === 0 || i === n - 1 || i === Math.floor(n / 2) ? `<text x="${pad + i * bw + bw / 2}" y="${h + 12}" text-anchor="middle" font-size="10" fill="var(--muted)">${r[0]}</text>` : "")).join("");
    const last = pts[n - 1];
    return `<svg viewBox="0 0 ${w} ${h + 16}" class="spark" style="height:150px"><line x1="${pad}" x2="${w - pad}" y1="${y0}" y2="${y0}" stroke="var(--line)"/>${bars}${labels}</svg>
      <p class="note">Lucro líquido por ano (barras vermelhas = prejuízo). Último: ${big(last[1], cur)}${isNum(last[2]) ? ", receita " + big(last[2], cur) : ""}. Fonte: ${s_src(cur)}.</p>`;
  }
  const s_src = (cur) => (cur === "USD" ? "SEC (balanços XBRL)" : "CVM (DFP consolidado)");

  function viewStock(t) {
    const s = S.stocks.find((v) => v.ticker === t);
    if (!s) { app.innerHTML = `<a class="back" href="#/">← Voltar</a><p>Ação ${esc(t)} não encontrada nos dados de hoje.</p>`; return; }
    const peers = (S.bySector[s.market + "|" + s.sector] || []).filter((p) => p !== s);
    const M = [
      ["P/L", "pe", "low", (v) => x(v), true], ["P/VP", "pb", "low", (v) => x(v, 2), true], ["EV/EBIT", "ev_ebit", "low", (v) => x(v), !s.is_financial],
      ["EV/EBITDA", "ev_ebitda", "low", (v) => x(v), !s.is_financial], ["P/Receita", "ps", "low", (v) => x(v, 2), !s.is_financial], ["P/FCL", "p_fcf", "low", (v) => x(v), !s.is_financial],
      ["Dividend yield", "dy", "high", (v) => pct(v), true], ["ROE", "roe", "high", (v) => pct(v), true], ["ROIC", "roic", "high", (v) => pct(v), !s.is_financial],
      ["Margem EBIT", "ebit_margin", "high", (v) => pct(v), !s.is_financial], ["Margem líquida", "net_margin", "high", (v) => pct(v), true],
      ["Cresc. receita", "rev_growth", "high", (v) => pct(v), true], ["Dív. líq./EBITDA", "net_debt_ebitda", "low", (v) => x(v), !s.is_financial],
      ["Liquidez corrente", "current_ratio", "high", (v) => x(v, 2), !s.is_financial],
      ["P/L lucro médio 3 anos", "pe_avg3", "low", (v) => x(v), true],
      ["Cobertura de juros", "coverage", "high", (v) => (v >= 50 ? "sem dívida" : x(v) + "×"), !s.is_financial],
      ["Caixa ÷ lucro (3 anos)", "cfo_ni_3", "high", (v) => x(v, 2) + "×", !s.is_financial],
      ["Cresc. lucro 10 anos", "ni_growth_10", "high", (v) => pct(v, 0), true],
    ].filter((m) => m[4]);
    const positive = (k) => ["pe", "pe_avg3", "pb", "ev_ebit", "ev_ebitda", "ps", "p_fcf"].includes(k);
    const rowsM = M.map(([label, k, dir, fmt]) => {
      const v = s[k];
      const med = median(peers.map((p) => (positive(k) ? (p[k] > 0 ? p[k] : null) : p[k])));
      const valid = isNum(v) && (!positive(k) || v > 0);
      let cls = "";
      if (valid && isNum(med) && Math.abs(v - med) > Math.abs(med) * 0.02) cls = (dir === "low" ? v < med : v > med) ? "pos" : "neg";
      return `<tr><td class="l">${label}</td><td class="num ${cls}">${valid ? fmt(v) : "–"}</td><td class="num dim">${isNum(med) ? fmt(med) : "–"}</td></tr>`;
    }).join("");

    const why = [];
    const better = M.filter(([, k, dir]) => { const v = s[k]; const med = median(peers.map((p) => p[k])); return isNum(v) && isNum(med) && (!positive(k) || v > 0) && (dir === "low" ? v < med * 0.8 : v > med * 1.2); }).map((m) => m[0]);
    if (better.length) why.push(`Melhor que a mediana do setor (com folga de 20%) em: ${better.join(", ")}.`);
    if (s.graham_pass) why.push(`Passa no filtro de Graham para o investidor defensivo (${s.graham_score} de ${s.graham_total} testes com dados).`);
    if (s.graham_ent) why.push("Passa no filtro de Graham para o investidor empreendedor (P/L ≤ 9, P/VP ≤ 1,2, paga dividendo).");
    if (s.net_net) why.push(`Net-net: preço vale ${x(s.p_ncav, 2)}× o capital de giro líquido (ativo circulante menos todo o passivo).`);
    if (isNum(s.magic_rank)) why.push(`Posição ${x(s.magic_rank, 0)} na Fórmula Mágica do mercado ${s.market === "BR" ? "brasileiro" : "americano"}.`);
    if (isNum(s.bazin_price) && s.price < s.bazin_price) why.push(`Abaixo do preço-teto de Bazin (${money(s.bazin_price, s.currency)}).`);
    if (!why.length) why.push("Não se destaca como barata frente aos pares do setor hoje.");
    const mac = S.meta.macro || {};
    const rf = s.market === "BR" ? mac.selic : mac.us10y;
    if (isNum(s.pe) && s.pe > 0 && isNum(rf)) {
      const ey = 1 / s.pe;
      why.push(`Rendimento do lucro (1 ÷ P/L) de ${pct(ey)} contra ${pct(rf)} ${s.market === "BR" ? "da Selic" : "do Treasury de 10 anos"}: ${ey >= rf ? "acima" : "abaixo"} da renda fixa. Graham pedia rendimento do lucro pelo menos igual ao de títulos de boa qualidade.`);
    }
    const fl = (s.flags || []).map((f) => FLAGS[f] && `<li><span class="flag ${FLAGS[f][2] ? "red" : ""}">${esc(FLAGS[f][0])}</span> ${esc(FLAGS[f][1])}</li>`).filter(Boolean).join("");
    const up = upside(s);

    app.innerHTML = `<a class="back" href="javascript:history.back()">← Voltar</a>
      <div class="dhead"><div><h1>${esc(s.ticker)} <span class="mk">${s.market}</span></h1><div class="dim">${esc(s.name !== s.ticker ? s.name : "")} · ${esc(s.sector || "")}</div></div>
        <div class="price num">${money(s.price, s.currency)}</div>
        <button class="btn" data-star="${esc(s.ticker)}">${favs.has(s.ticker) ? "★ Favorito" : "☆ Favoritar"}</button></div>
      <div class="kpis">
        <div class="card kpi"><div class="label">Score final</div><div class="big-score num">${x(s.final_score, 0)}</div><div class="bar" style="width:100%;margin-top:8px"><i style="width:${s.final_score || 0}%"></i></div></div>
        <div class="card kpi"><div class="label">Valor / Qualidade</div><div class="value num">${x(s.value_score, 0)} / ${x(s.quality_score, 0)}</div><div class="hint">percentil vs. setor (0-100)</div></div>
        <div class="card kpi"><div class="label">Número de Graham</div><div class="value num">${money(s.graham_value, s.currency)}</div><div class="hint ${isNum(up) ? (up > 0 ? "pos" : "neg") : ""}">${isNum(up) ? (up > 0 ? "+" : "") + pct(up, 0) + " vs. preço" : "precisa de LPA e VPA positivos"}</div></div>
        <div class="card kpi"><div class="label">Valor de mercado</div><div class="value num">${big(s.market_cap, s.currency)}</div><div class="hint">liquidez diária ${big(s.liquidity, s.currency)}</div></div>
      </div>
      <div class="grid2">
        <div class="card"><h2>Indicadores vs. mediana do setor</h2>
          <table class="mt"><thead><tr><th class="l">Indicador</th><th>${esc(s.ticker)}</th><th>Setor (${peers.length})</th></tr></thead><tbody>${rowsM}</tbody></table>
          <p class="note">Verde = melhor que a mediana dos pares; vermelho = pior.${s.is_financial ? " Financeira: EV, dívida e margens operacionais não se aplicam." : ""}</p></div>
        <div class="stack">
          <div class="card"><h2>Por que aparece barata</h2><ul class="why">${why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>
          <div class="card"><h2>Alertas</h2>${fl ? `<ul class="why">${fl}</ul>` : `<p class="note" style="margin:0">Nenhum alerta pelos dados disponíveis.</p>`}</div>
          ${grahamCard(s)}
          <div class="card"><h2>Lucro e receita em 10 anos</h2>${niChart(S.series[s.ticker], s.currency)}</div>
          <div class="card"><h2>Histórico do score</h2>${spark(S.hist[s.ticker])}</div>
        </div>
      </div>`;
  }

  function viewMethod() {
    const m = S.meta.sources || {};
    app.innerHTML = `<div class="prose"><h1>Metodologia</h1>
      <p class="sub">Regras tiradas da biblioteca de finanças (Graham, McKinsey Valuation, Damodaran, Berk-DeMarzo, Brealey-Myers, Ross, Gitman, Rosenbaum, material CFA).</p>
      <h2>1. Universo</h2><p>Brasil: ações da B3 com liquidez diária média acima de R$ 200 mil. EUA: as empresas do S&amp;P 500.</p>
      <h2>2. Score de valor (60%)</h2><p>Cada múltiplo vira um percentil dentro do próprio setor e mercado (banco comparado com banco, Brasil com Brasil). Pesos: EV/EBIT 25, P/VP 15, EV/EBITDA 15, P/L 10, P/L sobre o lucro médio de 3 anos 10, dividend yield 10, P/FCL 8, P/Receita 7. Financeiras: P/VP 40, P/L 20, P/L médio 20, DY 20. Múltiplos negativos (prejuízo, patrimônio negativo) não contam como baratos.</p>
      <h2>3. Score de qualidade (40%)</h2><p>ROIC 30, dívida líquida/EBITDA 15, estabilidade do lucro em 10 anos 10, cobertura de juros 10, crescimento de receita 10, margens 15, caixa ÷ lucro 5, liquidez corrente 5. Financeiras: ROE 50, estabilidade 25, crescimento 15, margem 10. Motivo: ação barata com retorno abaixo do custo de capital costuma ser armadilha de valor.</p>
      <h2>4. Penalidades</h2><table><tbody>${Object.values(FLAGS).map((f) => `<tr><td><span class="flag ${f[2] ? "red" : ""}">${esc(f[0])}</span></td><td>${esc(f[1])}</td></tr>`).join("")}</tbody></table>
      <h2>5. Estratégias de Graham</h2><p>Defensivo (cap. 14): os 7 testes — porte, balanço forte, 10 anos de lucro, dividendos, crescimento de 1/3 do lucro em 10 anos, P/L ≤ 15 sobre o lucro médio de 3 anos e P/L × P/VP ≤ 22,5. Empreendedor (cap. 15): P/L ≤ 9, P/VP ≤ 1,2, paga dividendo, liquidez corrente ≥ 1,5. Net-net: preço abaixo de ativo circulante menos todo o passivo. O histórico vem dos balanços oficiais (CVM e SEC), atualizado toda semana.</p>
      <h2>6. Preços de referência</h2><p>Número de Graham = √(22,5 × LPA × VPA). Preço-teto de Bazin = dividendos de 12 meses ÷ 6%. São referências educacionais, não preço-alvo.</p>
      <h2>7. Fontes e atualização</h2><p>Atualização automática uma vez por dia útil, após o fechamento da B3. Brasil: ${esc(m.BR || "Fundamentus")}. EUA: ${esc(m.US || "Yahoo Finance")}. Macro: ${esc(m.macro || "BCB e FRED")}. Histórico guardado em banco Postgres (Neon).</p>
      <h2>Aviso</h2><p>Ferramenta educacional. Não é recomendação de compra ou venda, nem análise de analista credenciado pela CVM. Indicadores olham para o passado; confira os demonstrativos antes de qualquer decisão.</p></div>`;
  }

  // ---------- router + events ----------
  function route() {
    if (!S.stocks.length) { app.innerHTML = `<div class="card"><p class="sub" style="margin:0">Dados ainda não disponíveis. A coleta roda uma vez por dia útil.</p></div>`; }
    const h = location.hash.replace(/^#\/?/, "");
    const [p, arg] = h.split("/");
    document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === (p || "ranking") || (p === "acao" && a.dataset.tab === "ranking")));
    if (!S.stocks.length && p !== "metodologia") return;
    if (p === "acao" && arg) return viewStock(decodeURIComponent(arg));
    if (p !== "estrategias") S._strat = null;
    if (p === "estrategias") return viewStrategies(arg);
    if (p === "setores") return viewSectors();
    if (p === "favoritos") return viewFavs();
    if (p === "metodologia") return viewMethod();
    return viewRanking();
  }
  window.addEventListener("hashchange", () => { S.shown = 100; route(); window.scrollTo(0, 0); });

  app.addEventListener("click", (e) => {
    const t = e.target;
    const star = t.closest("[data-star]");
    if (star) {
      e.stopPropagation();
      const k = star.dataset.star;
      favs.has(k) ? favs.delete(k) : favs.add(k);
      store.set("favs", [...favs]);
      return route();
    }
    const mkt = t.closest("[data-mkt]");
    if (mkt) { S.market = mkt.dataset.mkt; S.sector = ""; savePrefs(); return route(); }
    const st = t.closest("[data-strat]");
    if (st) { location.hash = "#/estrategias/" + st.dataset.strat; return; }
    const th = t.closest("th[data-sort]");
    if (th && th.dataset.sort !== "fav" && th.dataset.sort !== "flags") {
      const k = th.dataset.sort;
      S.sort = [k, S.sort[0] === k ? -S.sort[1] : ["pe", "pb", "ev_ebit", "magic_rank", "p_ncav", "ticker", "sector"].includes(k) ? 1 : -1];
      return route();
    }
    if (t.closest("[data-more]")) { S.shown += 100; return route(); }
    const sec = t.closest("tr[data-sector]");
    if (sec && !t.closest("a")) { S.sector = sec.dataset.sector; S.market = sec.dataset.smkt; location.hash = "#/"; return; }
    const tr = t.closest("tr[data-t]");
    if (tr) location.hash = "#/acao/" + encodeURIComponent(tr.dataset.t);
  });
  app.addEventListener("input", (e) => {
    if (e.target.id === "q") {
      S.q = e.target.value;
      const pos = e.target.selectionStart;
      route();
      const q = $("#q"); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
    }
  });
  app.addEventListener("change", (e) => {
    if (e.target.id === "sector") { S.sector = e.target.value; route(); }
    if (e.target.id === "noflags") { S.noFlags = e.target.checked; savePrefs(); route(); }
  });

  load();
})();
