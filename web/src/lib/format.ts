export function fmtPct(v?: number | null, digits = 1) {
  if (v == null || Number.isNaN(v)) return "—";
  const pct = Math.abs(v) <= 1.5 && Math.abs(v) > 0 ? v * 100 : v;
  return `${pct.toFixed(digits)}%`;
}

export function fmtBRL(v?: number | null) {
  if (v == null || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (abs >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function fmtNum(v?: number | null, digits = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtMetric(value?: number | null, unit?: string) {
  if (value == null || Number.isNaN(value)) return "—";
  if (unit === "%") return fmtPct(value);
  if (unit === "pp") {
    const pct = Math.abs(value) <= 1.5 ? value * 100 : value;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)} pp`;
  }
  if (unit === "x") return `${fmtNum(value, 1)}x`;
  if (unit === "R$") return `R$ ${fmtNum(value, 2)}`;
  return fmtNum(value, 1);
}
