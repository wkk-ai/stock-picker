/* Pages. Every page answers one question: which stocks are cheap and good right now, and why. */
"use strict";

METRICS.ev_ebit = { l: "EV/EBIT", get: (s) => (s.ev_ebit > 0 ? s.ev_ebit : null), f: (v) => x(v) };
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };
const star = (s) => `<button class="star${S.favs.has(s.ticker) ? " on" : ""}" data-star="${esc(s.ticker)}" aria-label="Favoritar ${esc(s.ticker)}" title="Favoritar">${S.favs.has(s.ticker) ? "★" : "☆"}</button>`;
const sigbar = (s) => `<span class="sigbar" data-tip="${esc((s.signals || []).filter((g) => g[1] !== null).map((g) => (g[1] ? "✓ " : "✕ ") + sigName(g)).join("<br>"))}">${(s.signals || []).filter((g) => g[1] !== null).sort((a, b) => b[1] - a[1]).map((g) => `<i class="${g[1] ? "y" : ""}"></i>`).join("")}<span>${s.sig_ok}/${s.sig_total}</span></span>`;
const sigLi = (title, detail, ok) => `<li><span class="mk ${ok === true ? "ok" : ok === false ? "no" : "na"}">${ok === true ? "✓" : ok === false ? "!" : "–"}</span><span><b>${esc(title)}</b>${detail ? `<span class="d">: ${esc(detail)}</span>` : ""}</span></li>`;
const counts = (list) => { const c = {}; for (const v of VORDER) c[v] = 0; for (const s of list) c[s.verdict] = (c[s.verdict] || 0) + 1; return c; };
const vbar = (c, total) => VORDER.filter((v) => c[v]).map((v) => `<i style="--c:${vcolor(v)};flex:${c[v]}${v === "evitar" ? ";opacity:.55" : ""}" data-tip="<b>${VERDICTS[v].l}</b><br>${c[v]} de ${total} ações"></i>`).join("");
const rfLabel = () => (S.market === "US" ? "Treasury de 10 anos" : "Selic");

// ---------- Hoje ----------
function viewHome() {
  const list = inMarket(), c = counts(list), ops = list.filter((s) => s.verdict === "oportunidade").sort(byScore), n = ops.length;
  const r = S.market === "ALL" ? null : rf(S.market);
  const secs = {}; for (const s of list) (secs[s.sector || "Outros"] ||= []).push(s);
  const secRows = Object.entries(secs).map(([k, arr]) => ({ k, arr, c: counts(arr) })).sort((a, b) => b.c.oportunidade - a.c.oportunidade || b.arr.length - a.arr.length).slice(0, 12);
  const maxSec = Math.max(...secRows.map((q) => q.arr.length), 1);
  app.innerHTML = `
    <h1>${n ? `${n} ${n === 1 ? "ação" : "ações"} ${marketName()} ${n === 1 ? "está barata e boa" : "estão baratas e boas"} hoje.` : "Nenhuma ação passa em todos os critérios hoje."}</h1>
    <p class="lede">De ${list.length} analisadas, ${n === 1 ? "é a que tem" : "são as que têm"} preço baixo contra o setor, retorno acima do custo de capital, nenhum alerta grave e a maioria dos sinais a favor. Outras ${c.barata_risco} parecem baratas, mas carregam risco.${isNum(r) ? ` Referência de renda fixa: ${rfLabel()} a ${pct(r, 2)} ao ano.` : ""}</p>
    <div class="vbar">${vbar(c, list.length)}</div>
    <div class="vlegend">${VORDER.map((v) => `<a href="#/explorar" data-vf="${v}" data-tip="${esc(VERDICTS[v].d)}">${vdot(v)}<b>${c[v]}</b> ${VERDICTS[v].pl}</a>`).join("")}</div>

    <section class="sec"><h2>Onde estão as melhores</h2>
      <p class="sub">Cada bolha é uma ação. Quanto mais à direita, mais barata; quanto mais alta, melhor a empresa. O tamanho é o valor de mercado. O canto verde é o que interessa.</p>
      <div class="cols"><div id="c-matrix"></div>
        <div><h3>As ${Math.min(10, n)} primeiras</h3><ol class="rank">${ops.slice(0, 10).map((s) => `<li><a href="#/acao/${esc(s.ticker)}" data-st="${esc(s.ticker)}"><span><span class="tk">${esc(s.ticker)}</span><span class="nm">${esc(s.name !== s.ticker ? s.name : s.sector)}</span></span>${spark(s.spark)}<span class="sc">${x(s.final_score, 0)}</span></a></li>`).join("") || `<li class="muted" style="padding:10px 0">Nada por aqui hoje.</li>`}</ol>
          <p class="note">Ordenadas pelo score: 60% valor, 40% qualidade. <a href="#/explorar" data-vf="oportunidade">Ver todas</a></p></div></div>
    </section>

    ${n ? `<section class="sec"><h2>Por que estas</h2><p class="sub">Os motivos a favor e o que pesa contra cada uma, com o número por trás.</p>
      <div class="why">${ops.slice(0, 6).map((s) => `<article><header><a href="#/acao/${esc(s.ticker)}">${esc(s.ticker)}</a>${sigbar(s)}</header>
        <p class="meta">${esc(s.name !== s.ticker ? s.name + ", " : "")}${esc(s.sector || "")}</p>
        <ul class="sig">${pros(s, 3).map((g) => sigLi(SIGNALS[g[0]], g[2], true)).join("")}${cons(s, 2).map((g) => sigLi(g[0], g[1], false)).join("")}</ul></article>`).join("")}</div></section>` : ""}

    <section class="sec"><div class="cols even">
      <div><h2>Por setor</h2><p class="sub">Quantas ações de cada tipo há em cada setor. Os setores com mais baratas e boas vêm primeiro.</p>
        <div class="hbars">${secRows.map((q) => `<a class="hbar" href="#/explorar" data-sector="${esc(q.k)}"><span class="l">${esc(q.k)}</span><span class="b" style="width:${Math.max(6, (q.arr.length / maxSec) * 100)}%">${vbar(q.c, q.arr.length)}</span><span class="n">${q.c.oportunidade} de ${q.arr.length}</span></a>`).join("")}</div></div>
      <div><h2>O mercado está barato?</h2><p class="sub">Quanto o lucro operacional rende sobre o valor da empresa (EBIT ÷ EV).${isNum(r) ? ` Em verde, as ações que rendem mais que a ${rfLabel()}.` : ""}</p>
        <div id="c-hist"></div></div>
    </div></section>`;
  mount("c-matrix", (w) => scatter(list, w, { x: "value_score", y: "quality_score", quad: QUAD, labels: w < 520 ? 5 : 10 }));
  mount("c-hist", (w) => histogram(list, w, "ey", { lo: 0, hi: 0.4, step: 0.02, ref: r, refLabel: isNum(r) ? `${rfLabel()} ${pct(r, 2)}` : "" }));
}
const QUAD = { x: 60, y: 55, labels: ["Boas, mas caras", "Baratas e boas", "Caras e fracas", "Baratas, com risco"] };

// ---------- Mapa ----------
const MAP_PRESETS = {
  matriz: ["Valor × qualidade", "value_score", "quality_score", "Direita = mais barata contra o setor. Alto = empresa melhor. O canto verde junta as duas coisas."],
  magica: ["Barata × rentável", "ey", "roic", "A ideia da Fórmula Mágica de Greenblatt: lucro operacional alto sobre o preço (direita) e retorno alto sobre o capital (alto)."],
  dividendos: ["Dividendos × dívida", "dy", "net_debt_ebitda", "Dividendo alto só vale com dívida baixa. Procure à direita e embaixo."],
  desconto: ["Desconto × tendência", "graham_gap", "ret_12m", "Direita = preço abaixo do número de Graham. Embaixo = o preço caiu em 12 meses: pode ser oportunidade ou problema."],
  plroe: ["P/L × ROE", "pe", "roe", "Esquerda = paga pouco pelo lucro. Alto = lucro alto sobre o patrimônio. Procure à esquerda e em cima."],
};
function viewMap() {
  const list = inMarket(), m = S.map, hide = m.hide || (m.hide = new Set());
  const shown = list.filter((s) => !hide.has(s.verdict)), pre = MAP_PRESETS[m.preset];
  const opt = (sel) => Object.entries(METRICS).filter(([k]) => k !== "final_score").map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v.short || v.l)}</option>`).join("");
  app.innerHTML = `
    <h1>O mercado em um mapa.</h1>
    <p class="lede">Escolha uma forma de olhar. A cor é sempre o veredito; o tamanho da bolha é o valor de mercado. Passe o mouse para ver os números e clique para abrir a ação.</p>
    <section class="sec" style="margin-top:36px">
      <div class="chips">${Object.entries(MAP_PRESETS).map(([k, v]) => `<button class="chip${m.preset === k ? " on" : ""}" data-mp="${k}">${v[0]}</button>`).join("")}</div>
      <div class="controls"><label>Horizontal <select id="mx">${opt(m.x)}</select></label><label>Vertical <select id="my">${opt(m.y)}</select></label><span class="spacer"></span>
        ${VORDER.map((v) => `<button class="chip tog${hide.has(v) ? " off" : ""}" data-mv="${v}" aria-pressed="${!hide.has(v)}">${vdot(v)}${VERDICTS[v].l}</button>`).join("")}</div>
      ${pre ? `<p class="sub">${pre[3]}</p>` : ""}
      <div id="c-map"></div>
      <p class="note">Valores extremos ficam presos na borda do gráfico para não esmagar o resto. Ações sem o dado de um dos eixos não aparecem.</p>
    </section>
    <section class="sec"><h2>Tamanho e veredito</h2><p class="sub">Cada retângulo é uma empresa, agrupada por setor. A área é o valor de mercado. Verde forte é barata e boa.</p><div id="c-tree"></div></section>`;
  mount("c-map", (w) => scatter(shown, w, { x: m.x, y: m.y, quad: m.x === "value_score" && m.y === "quality_score" ? QUAD : null, labels: w < 520 ? 6 : 14, h: Math.round(Math.min(640, Math.max(340, w * 0.56))) }));
  mount("c-tree", (w) => treemap(list, w));
}

// ---------- Explorar ----------
const PRESETS = {
  graham_pass: ["Graham defensivo", (s) => s.graham_pass, "Passa em todos os testes do investidor defensivo de Graham que têm dado."],
  graham_ent: ["Graham empreendedor", (s) => s.graham_ent, "Critérios mais soltos de Graham para quem aceita mais trabalho."],
  net_net: ["Net-net", (s) => s.net_net, "Preço abaixo do capital de giro líquido: a pechincha clássica de Graham."],
  magic: ["Fórmula Mágica", (s) => isNum(s.magic_rank) && s.magic_rank <= 30, "As 30 primeiras na soma de barata (EBIT ÷ EV) com rentável (ROIC), de Greenblatt."],
  bazin: ["Bazin", (s) => isNum(s.bazin_price) && s.price > 0 && s.price <= s.bazin_price, "Preço abaixo do teto de Bazin: dividendo de pelo menos 6% ao ano."],
  favs: ["Favoritos ★", (s) => S.favs.has(s.ticker), "As ações que você marcou com a estrela."],
};
const COLS = [
  ["ticker", "Ação", "l", (s) => s.ticker, (s) => `${star(s)} <span class="tk">${esc(s.ticker)}</span><span class="nm">${esc(s.name !== s.ticker ? s.name : s.sector || "")}</span>`],
  ["verdict", "Veredito", "l", (s) => -VORDER.indexOf(s.verdict), (s) => pill(s.verdict)],
  ["final_score", "Score", "", (s) => s.final_score, (s) => `<span class="scorebar"><i><b style="width:${s.final_score || 0}%"></b></i>${x(s.final_score, 0)}</span>`],
  ["value_score", "Valor", "hide-sm", (s) => s.value_score, (s) => x(s.value_score, 0)],
  ["quality_score", "Qualidade", "hide-sm", (s) => s.quality_score, (s) => x(s.quality_score, 0)],
  ["sig", "Sinais", "l", (s) => (s.sig_total ? s.sig_ok / s.sig_total : null), (s) => sigbar(s)],
  ["pe", "P/L", "", (s) => (s.pe > 0 ? s.pe : null), (s) => (s.pe > 0 ? x(s.pe) : "–")],
  ["pb", "P/VP", "hide-sm", (s) => (s.pb > 0 ? s.pb : null), (s) => (s.pb > 0 ? x(s.pb, 2) : "–")],
  ["dy", "DY", "", (s) => s.dy, (s) => pct(s.dy)],
  ["ret", "ROIC/ROE", "", (s) => ret(s), (s) => pct(ret(s), 0)],
  ["net_debt_ebitda", "Dív/EBITDA", "hide-sm", (s) => s.net_debt_ebitda, (s) => (s.is_financial ? "–" : x(s.net_debt_ebitda))],
  ["ret_12m", "12 meses", "", (s) => s.ret_12m, (s) => `<span style="display:inline-flex;gap:8px;align-items:center">${spark(s.spark, 44, 18)}<span class="${s.ret_12m >= 0 ? "up" : "down"}">${spct(s.ret_12m)}</span></span>`],
];
function exList() {
  const e = S.ex, q = e.q.trim().toLowerCase();
  let list = inMarket().filter((s) => (!q || s.ticker.toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q)) && (!e.sector || s.sector === e.sector) && (!e.verdicts.length || e.verdicts.includes(s.verdict)) && (!e.preset || PRESETS[e.preset][1](s)));
  const col = COLS.find((c) => c[0] === e.sort[0]) || COLS[2], dir = e.sort[1];
  return list.map((s) => [s, col[3](s)]).sort((a, b) => {
    const na = a[1] === null || a[1] === undefined || (typeof a[1] === "number" && !isFinite(a[1])), nb = b[1] === null || b[1] === undefined || (typeof b[1] === "number" && !isFinite(b[1]));
    if (na || nb) return na - nb || a[0].ticker.localeCompare(b[0].ticker);
    return (typeof a[1] === "string" ? a[1].localeCompare(b[1]) : a[1] - b[1]) * dir || a[0].ticker.localeCompare(b[0].ticker);
  }).map((p) => p[0]);
}
function drawTable() {
  const el = $("#extable"); if (!el) return;
  const list = exList(), e = S.ex, rows = list.slice(0, e.shown);
  el.innerHTML = `<p class="note" style="margin:0 0 10px">${list.length} ${list.length === 1 ? "ação" : "ações"}${e.preset ? ". " + PRESETS[e.preset][2] : ""}</p>
    ${list.length ? `<div class="tablewrap"><table><thead><tr>${COLS.map((c) => `<th class="${c[2]}${e.sort[0] === c[0] ? " sorted" : ""}" data-sort="${c[0]}" aria-sort="${e.sort[0] === c[0] ? (e.sort[1] > 0 ? "ascending" : "descending") : "none"}">${c[1]}${e.sort[0] === c[0] ? (e.sort[1] > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((s) => `<tr data-t="${esc(s.ticker)}">${COLS.map((c) => `<td class="${c[2]} num">${c[4](s)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    ${list.length > rows.length ? `<button class="btn more" data-more>Mostrar mais ${Math.min(60, list.length - rows.length)}</button>` : ""}` : `<p class="muted" style="padding:28px 0">Nenhuma ação com esses filtros. Tire um filtro para ver mais.</p>`}`;
}
function viewExplore() {
  const e = S.ex, sectors = [...new Set(inMarket().map((s) => s.sector).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (e.sector && !sectors.includes(e.sector)) e.sector = "";
  app.innerHTML = `
    <h1>Todas as ações, do seu jeito.</h1>
    <p class="lede">Filtre por veredito, setor ou por um método clássico. Clique no título de uma coluna para ordenar e em uma linha para abrir a ação.</p>
    <section class="sec" style="margin-top:36px">
      <div class="controls"><input type="search" id="exq" placeholder="Buscar por código ou nome" value="${esc(e.q)}" aria-label="Buscar ação">
        <select id="exsec" aria-label="Setor"><option value="">Todos os setores</option>${sectors.map((k) => `<option${k === e.sector ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></div>
      <div class="chips">${VORDER.map((v) => `<button class="chip${e.verdicts.includes(v) ? " on" : ""}" data-chipv="${v}" data-tip="${esc(VERDICTS[v].d)}">${vdot(v)}${VERDICTS[v].l}</button>`).join("")}</div>
      <div class="chips">${Object.entries(PRESETS).map(([k, v]) => `<button class="chip${e.preset === k ? " on" : ""}" data-preset="${k}" data-tip="${esc(v[2])}">${v[0]}</button>`).join("")}</div>
      <div id="extable"></div>
    </section>`;
  drawTable();
}

// ---------- Setores ----------
function viewSectors() {
  const groups = {}; for (const s of inMarket()) (groups[s.market + "|" + (s.sector || "Outros")] ||= []).push(s);
  const rows = Object.entries(groups).map(([k, arr]) => ({ mkt: k.split("|")[0], sector: k.split("|")[1], arr, med: median(arr.map((s) => s.final_score)), ops: arr.filter((s) => s.verdict === "oportunidade").length }))
    .filter((r) => r.arr.length >= 3).sort((a, b) => b.ops - a.ops || (b.med || 0) - (a.med || 0));
  const best = rows[0];
  app.innerHTML = `
    <h1>${best && best.ops ? `${esc(best.sector)} é onde há mais ações baratas e boas.` : "Os setores lado a lado."}</h1>
    <p class="lede">Cada ponto é uma ação, posicionada pelo score final. O traço preto é a mediana do setor. À direita, quantas do setor estão baratas e boas. Clique no nome de um setor para ver as ações dele.</p>
    <section class="sec" style="margin-top:36px"><div id="c-strips"></div>
      <div class="vlegend" style="margin-top:20px">${VORDER.map((v) => `<a>${vdot(v)}${VERDICTS[v].l}</a>`).join("")}</div>
      <p class="note">O score compara cada ação com as do mesmo setor, então um setor inteiro caro não aparece como "barato" aqui: o que aparece é quem se destaca dentro dele. Setores com menos de 3 ações ficam de fora.</p></section>`;
  mount("c-strips", (w) => strips(rows, w));
}

// ---------- Ação ----------
const G_TESTS = [
  ["Porte", "Está no terço maior do mercado em valor"], ["Balanço forte", "Liquidez corrente de 2 ou mais e dívida longa menor que o capital de giro"],
  ["Lucro estável", "Nenhum prejuízo nos últimos 10 anos"], ["Dividendos", "Pagou dividendo em todos os anos do histórico"],
  ["Crescimento", "Lucro médio de 3 anos pelo menos um terço maior que 10 anos antes"], ["P/L moderado", "Preço até 15 vezes o lucro médio de 3 anos"],
  ["P/VP moderado", "P/VP até 1,5, ou P/L × P/VP até 22,5"],
];
function thesis(s) {
  const p = pros(s, 2).map((g) => g[2]).filter(Boolean), c = cons(s, 2);
  const open = { oportunidade: "Está barata e a empresa é boa", barata_risco: "Parece barata, mas tem risco", boa_cara: "A empresa é boa, mas o preço já reflete isso", neutra: "Nada chama atenção: nem barata, nem especialmente boa", evitar: "Os números pedem distância" }[s.verdict];
  return `${open}.${p.length ? ` A favor: ${esc(p.join("; "))}.` : ""}${c.length ? ` Contra: ${esc(c.map((q) => q[0].toLowerCase()).join(" e "))}.` : ""}`;
}
function viewStock(tk) {
  const s = S.byTicker[tk];
  if (!s) { app.innerHTML = `<h1>Ação não encontrada.</h1><p class="lede">O código ${esc(tk)} não está na base. <a href="#/explorar">Buscar outra ação</a></p>`; return; }
  const peers = peersOf(s), cur = s.currency, fin = s.is_financial, ser = S.series[s.ticker] || [];
  const tracks = [["pe", "P/L", "low"], ["pb", "P/VP", "low"], !fin && ["ev_ebit", "EV/EBIT", "low"], ["dy", "Dividend yield", "high"], [fin ? "roe" : "roic", fin ? "ROE" : "ROIC", "high"], !fin && ["ebit_margin", "Margem EBIT", "high"], !fin && ["net_debt_ebitda", "Dívida líq. ÷ EBITDA", "low"], ["ret_12m", "Preço em 12 meses", "high"]].filter(Boolean)
    .map(([k, l, dir]) => { const v = mget(k, s), p = pctRank(s, k, dir), md = median(peers.map((q) => mget(k, q))); return v === null || p === null ? "" : `<div class="trk"><span>${l}</span><span class="v">${METRICS[k].f(v)}</span><span class="t" data-tip="<b>${l}: ${METRICS[k].f(v)}</b><br>Melhor que ${x(p, 0)}% do setor<br><span class='m'>Mediana do setor: ${METRICS[k].f(md)}</span>"><i class="${p >= 60 ? "good" : p <= 40 ? "bad" : ""}" style="left:${Math.max(2, Math.min(98, p))}%"></i></span><span class="m">mediana ${METRICS[k].f(md)}</span></div>`; }).join("");
  const mini = (title, rows, fmt) => { const pts = rows.filter((r) => isNum(r[1])); return `<div><h3>${title}</h3><div class="last">${pts.length ? fmt(pts[pts.length - 1][1]) : "–"}</div><div id="m-${title.replace(/\W/g, "")}"></div></div>`; };
  const minis = [["Lucro líquido", ser.map((r) => [r[0], r[1]]), (v) => big(v, cur)], ["Receita", ser.map((r) => [r[0], r[2]]), (v) => big(v, cur)], ["Margem EBIT", ser.map((r) => [r[0], isNum(r[3]) && r[2] > 0 ? r[3] / r[2] : null]), (v) => pct(v)], ["Dividendos pagos", ser.map((r) => [r[0], r[4]]), (v) => big(v, cur)]];
  const flags = (s.flags || []).filter((f) => FLAGS[f]).sort((a, b) => FLAGS[b][2] - FLAGS[a][2]);
  const cs = s.graham_checks || [];
  app.innerHTML = `
    <a class="back" href="#/explorar">← Todas as ações</a>
    <div class="shead"><div><h1>${esc(s.ticker)} ${star(s)}</h1><div class="co">${esc(s.name !== s.ticker ? s.name + ", " : "")}${esc(s.sector || "")}${s.market === "BR" ? ", Brasil" : ", EUA"}</div></div>
      <div style="text-align:right"><div class="px num">${money(s.price, cur)}</div><div class="${s.ret_12m >= 0 ? "up" : "down"}" style="font-size:13.5px">${spct(s.ret_12m)} em 12 meses</div></div></div>
    <div style="margin-top:18px">${pill(s.verdict, true)}</div>
    <p class="thesis">${thesis(s)}</p>
    <div class="kv">
      <div><div class="k">Score final</div><div class="v num">${x(s.final_score, 0)}</div><div class="h">de 100, contra o setor</div></div>
      <div><div class="k">Valor</div><div class="v num">${x(s.value_score, 0)}</div><div class="h">mais barata que ${x(s.value_score, 0)}% do setor</div></div>
      <div><div class="k">Qualidade</div><div class="v num">${x(s.quality_score, 0)}</div><div class="h">melhor que ${x(s.quality_score, 0)}% do setor</div></div>
      <div><div class="k">Sinais a favor</div><div class="v num">${s.sig_ok} de ${s.sig_total}</div><div class="h">${big(s.market_cap, cur)} de valor de mercado</div></div>
    </div>

    <section class="sec"><div class="cols">
      <div><h2>Os motivos</h2><p class="sub">Dez perguntas que os livros de valor fazem a qualquer ação, com a resposta e o número.</p>
        <ul class="sig">${(s.signals || []).map((g) => sigLi(sigName(g), g[1] === null ? "sem dado ou não se aplica" : g[2], g[1])).join("")}</ul></div>
      <div><h2>Perfil</h2><p class="sub">Contra o setor. 50 é a mediana.</p><div id="c-radar"></div></div>
    </div></section>

    <section class="sec"><h2>Preço</h2><p class="sub">A tendência do preço e onde ele está contra as referências de valor.</p>
      <div id="pricebox"></div><div id="c-ruler" style="margin-top:24px"></div>
      <p class="note">Número de Graham = raiz de 22,5 × lucro por ação × valor patrimonial por ação. Teto de Bazin = dividendo por ação ÷ 6%. São réguas, não preço-alvo.</p></section>

    <section class="sec"><div class="cols even">
      <div><h2>Contra o setor</h2><p class="sub">A bolinha mostra a posição entre ${peers.length} empresas comparáveis. À direita é sempre melhor.</p>
        <div class="trkhead"><span>pior que o setor</span><span>melhor que o setor</span></div>${tracks || `<p class="note">Sem dados para comparar.</p>`}</div>
      <div><h2>No mapa do setor</h2><p class="sub">Valor na horizontal, qualidade na vertical.</p><div id="c-peers"></div></div>
    </div></section>

    <section class="sec"><h2>Histórico do negócio</h2><p class="sub">Até 12 anos de balanços anuais. Lucro estável e crescente vale mais que um ano bom.</p>
      ${ser.length >= 2 ? `<div class="minis">${minis.map((m) => mini(...m)).join("")}</div>` : `<p class="note">Ainda sem histórico de balanços para esta ação.</p>`}</section>

    <section class="sec"><div class="cols even">
      <div><h2>Alertas</h2>${flags.length ? `<ul class="flags">${flags.map((f) => `<li>${FLAGS[f][2] ? `<span class="mk no" style="display:inline-grid;vertical-align:-3px;margin-right:8px">!</span>` : ""}<b>${FLAGS[f][0]}.</b> <span class="muted">${FLAGS[f][1]}</span></li>`).join("")}</ul>` : `<p class="sub">Nenhum alerta nos dados disponíveis.</p>`}</div>
      <div><h2>Checklist de Graham</h2>${cs.length ? `<p class="sub">Passa em ${s.graham_score} de ${s.graham_total} testes do investidor defensivo com dado disponível.</p><ul class="sig">${G_TESTS.map(([t, d], i) => sigLi(t, d, cs[i] === "ok" ? true : cs[i] === "fail" ? false : null)).join("")}</ul>` : `<p class="sub">Sem dados suficientes.</p>`}</div>
    </div></section>`;
  mount("c-radar", (w) => radar(s.dims, w));
  mount("c-ruler", (w) => ruler([{ v: s.lo_52w, label: "Mínima de 52 semanas" }, { v: s.hi_52w, label: "Máxima de 52 semanas" }, { v: s.price, label: "Preço hoje", strong: true }, { v: s.graham_value, label: "Número de Graham" }, { v: s.bazin_price, label: "Teto de Bazin" }], w, cur));
  mount("c-peers", (w) => scatter(peers, w, { x: "value_score", y: "quality_score", quad: QUAD, hl: s.ticker, h: Math.round(Math.min(380, Math.max(280, w * 0.7))) }));
  if (ser.length >= 2) minis.forEach(([title, rows, fmt]) => mount("m-" + title.replace(/\W/g, ""), (w) => miniBars(rows, w, fmt)));
  priceCard(s);
}

// ---------- Método ----------
function viewMethod() {
  const m = S.meta.macro || {}, src = S.meta.sources || {};
  app.innerHTML = `<div class="prose">
    <h1>Como o veredito é calculado.</h1>
    <p class="lede">Barato sozinho não basta. A regra dos livros de valor é: preço baixo, empresa que rende mais que o custo do capital, balanço que aguenta e lucro que se repete. O site mede cada parte e junta tudo em uma frase.</p>
    <h2>Os cinco vereditos</h2>
    <ul>${VORDER.map((v) => `<li>${vdot(v)} <b style="color:var(--ink)">${VERDICTS[v].l}.</b> ${VERDICTS[v].d}</li>`).join("")}</ul>
    <h2>Valor e qualidade</h2>
    <p><b style="color:var(--ink)">Valor</b> (0 a 100) compara os múltiplos da ação com os do mesmo setor: EV/EBIT, P/VP, EV/EBITDA, P/L, P/L no lucro médio de 3 anos, dividend yield, P/FCF e P/Receita. Para bancos e seguradoras valem P/VP, P/L e dividendos. <b style="color:var(--ink)">Qualidade</b> (0 a 100) faz o mesmo com ROIC, dívida, estabilidade do lucro, cobertura de juros, crescimento, margens e conversão de lucro em caixa. O score final é 60% valor e 40% qualidade, menos descontos por alerta.</p>
    <h2>Os dez sinais</h2>
    <ul>${Object.values(SIGNALS).map((l) => `<li>${l}</li>`).join("")}</ul>
    <p>Para ser "barata e boa" a ação precisa de valor 60 ou mais, qualidade 55 ou mais, nenhum alerta grave (prejuízo, patrimônio negativo, dívida alta, juros pesados, pico de ciclo), retorno acima do custo de capital e pelo menos 60% dos sinais a favor. A tendência do preço é só contexto: não entra na nota de valor.</p>
    <h2>Referências usadas hoje</h2>
    <p>Selic ${pct(m.selic, 2)}, IPCA em 12 meses ${pct(m.ipca_12m, 2)}, Treasury de 10 anos ${pct(m.us10y, 2)}. Custo de capital de referência: 13% no Brasil e 8% nos EUA.</p>
    <h2>De onde vêm os dados</h2>
    <ul><li>Brasil: ${esc(src.BR || "Fundamentus")}</li><li>EUA: ${esc(src.US || "Yahoo Finance")}</li><li>Histórico de balanços: ${esc(src.history || "CVM e SEC")}</li><li>Juros e inflação: ${esc(src.macro || "Banco Central")}</li></ul>
    <p>Tudo é coletado uma vez por dia útil, depois do fechamento.</p>
    <h2>Limites</h2>
    <ul><li>O site aponta candidatas. Não é recomendação de compra: leia o balanço e entenda o negócio antes.</li><li>Dados gratuitos têm erros e atrasos. Um zero pode ser dado faltando.</li><li>Múltiplos olham o passado. Uma ação pode estar barata porque o lucro vai cair.</li><li>O custo de capital é um número único por país, o que é duro com setores de retorno naturalmente baixo.</li></ul>
    <h2>Livros por trás das regras</h2>
    <p>O Investidor Inteligente e Security Analysis (Graham), The Little Book That Beats the Market (Greenblatt), Valuation (McKinsey), Faça Fortuna com Ações (Bazin).</p></div>`;
}

// ---------- router and events ----------
function route() {
  mounts = []; hideTip();
  const parts = location.hash.replace(/^#\/?/, "").split("/"), page = parts[0] || "hoje";
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.tab === (page === "acao" ? "explorar" : page)));
  document.querySelectorAll("#mkt button").forEach((b) => { b.classList.toggle("on", b.dataset.mkt === S.market); b.setAttribute("aria-pressed", b.dataset.mkt === S.market); });
  if (!S.stocks.length) { app.innerHTML = `<h1>Os dados não carregaram.</h1><p class="lede">Recarregue a página em alguns minutos. Se continuar, a coleta diária pode ter falhado.</p>`; return; }
  ({ hoje: viewHome, mapa: viewMap, explorar: viewExplore, setores: viewSectors, metodo: viewMethod, acao: () => viewStock(decodeURIComponent(parts[1] || "")) }[page] || viewHome)();
}
let lastHash = null;
window.addEventListener("hashchange", () => { const top = location.hash !== lastHash; lastHash = location.hash; route(); if (top) window.scrollTo(0, 0); });

document.addEventListener("click", (ev) => {
  const t = (sel) => ev.target.closest(sel);
  let el;
  if ((el = t("[data-star]"))) {
    ev.preventDefault(); ev.stopPropagation(); const k = el.dataset.star;
    S.favs.has(k) ? S.favs.delete(k) : S.favs.add(k); store.set("favs", [...S.favs]);
    el.classList.toggle("on", S.favs.has(k)); el.textContent = S.favs.has(k) ? "★" : "☆";
    if (S.ex.preset === "favs") drawTable(); return;
  }
  if ((el = t("[data-mkt]"))) { S.market = el.dataset.mkt; store.set("market", S.market); S.ex.shown = 60; route(); return; }
  if ((el = t("[data-vf]"))) { ev.preventDefault(); Object.assign(S.ex, { verdicts: [el.dataset.vf], preset: "", sector: "", q: "", shown: 60 }); go("#/explorar"); return; }
  if ((el = t("[data-sector]"))) { ev.preventDefault(); if (el.dataset.smkt && S.market === "ALL") { S.market = el.dataset.smkt; store.set("market", S.market); } Object.assign(S.ex, { sector: el.dataset.sector, verdicts: [], preset: "", q: "", shown: 60 }); go("#/explorar"); return; }
  if ((el = t("[data-mp]"))) { const p = MAP_PRESETS[el.dataset.mp]; Object.assign(S.map, { preset: el.dataset.mp, x: p[1], y: p[2] }); route(); return; }
  if ((el = t("[data-mv]"))) { const h = S.map.hide; h.has(el.dataset.mv) ? h.delete(el.dataset.mv) : h.add(el.dataset.mv); route(); return; }
  if ((el = t("[data-chipv]"))) { const v = el.dataset.chipv, a = S.ex.verdicts; S.ex.verdicts = a.includes(v) ? a.filter((q) => q !== v) : a.concat(v); S.ex.shown = 60; el.classList.toggle("on"); drawTable(); return; }
  if ((el = t("[data-preset]"))) { S.ex.preset = S.ex.preset === el.dataset.preset ? "" : el.dataset.preset; S.ex.shown = 60; if (S.ex.preset === "magic") S.ex.sort = ["final_score", -1]; route(); return; }
  if ((el = t("th[data-sort]"))) { const k = el.dataset.sort; S.ex.sort = S.ex.sort[0] === k ? [k, -S.ex.sort[1]] : [k, k === "ticker" || k === "pe" || k === "pb" || k === "net_debt_ebitda" ? 1 : -1]; drawTable(); return; }
  if (t("[data-more]")) { S.ex.shown += 60; drawTable(); return; }
  if ((el = t("[data-t]"))) { hideTip(); go("#/acao/" + encodeURIComponent(el.dataset.t)); }
});
document.addEventListener("input", (ev) => { if (ev.target.id === "exq") { S.ex.q = ev.target.value; S.ex.shown = 60; drawTable(); } });
document.addEventListener("change", (ev) => {
  if (ev.target.id === "exsec") { S.ex.sector = ev.target.value; S.ex.shown = 60; drawTable(); }
  if (ev.target.id === "mx" || ev.target.id === "my") { S.map[ev.target.id === "mx" ? "x" : "y"] = ev.target.value; S.map.preset = Object.keys(MAP_PRESETS).find((k) => MAP_PRESETS[k][1] === S.map.x && MAP_PRESETS[k][2] === S.map.y) || ""; route(); }
});
load();
