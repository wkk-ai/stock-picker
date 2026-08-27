export function Card({
  children,
  className = "",
  title,
  pad = true,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  pad?: boolean;
}) {
  return (
    <div className={`rounded-[4px] border border-line bg-elev ${className}`}>
      {title ? (
        <h2 className="border-b border-line px-4 py-3 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </h2>
      ) : null}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-muted">{children}</div>
  );
}

export function PageHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-[22px] font-semibold tracking-tight text-navy">{title}</h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-[13px] text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function ScorePill({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-faint">—</span>;
  const tone =
    value >= 75 ? "bg-soft text-accent" : value >= 55 ? "bg-[#FDF0E7] text-watch" : "bg-red-50 text-down";
  return (
    <span className={`inline-flex min-w-10 items-center justify-center rounded-[4px] px-2 py-0.5 font-mono text-[13px] ${tone}`}>
      {Math.round(value)}
    </span>
  );
}

export function BandChip({ band }: { band?: string | null }) {
  if (!band) return null;
  const good = band === "Attractive" || band === "Fair" || band === "Hold+" || band === "Watch";
  const bad = band === "Avoid";
  return (
    <span
      className={`inline-block rounded-[4px] px-2 py-0.5 text-[11px] tracking-wide ${
        bad ? "bg-red-50 text-down" : good ? "bg-soft text-accent" : "bg-[#FDF0E7] text-watch"
      }`}
    >
      {band}
    </span>
  );
}

export function Disclaimer({ text }: { text?: string }) {
  return (
    <p className="mt-8 max-w-3xl text-[12px] leading-relaxed text-faint">
      {text ||
        "Decision support only — not licensed investment advice under CVM rules. Past performance does not guarantee future results."}
    </p>
  );
}

export function Sparkline({ up = true }: { up?: boolean }) {
  const pts = up
    ? "0,200 60,190 120,170 180,175 240,140 300,150 360,110 420,125 480,90 540,100 600,70 700,55 700,240 0,240"
    : "0,80 60,90 120,110 180,100 240,140 300,130 360,160 420,150 480,180 540,170 600,200 700,210 700,240 0,240";
  const stroke = up ? "#0F7A4A" : "#B42318";
  const fill = up ? "rgba(15,122,74,.12)" : "rgba(180,35,24,.10)";
  return (
    <svg viewBox="0 0 700 240" className="block h-[220px] w-full bg-mist" preserveAspectRatio="none">
      <g stroke="#d5dde5" strokeWidth="1">
        <line x1="0" y1="60" x2="700" y2="60" />
        <line x1="0" y1="120" x2="700" y2="120" />
        <line x1="0" y1="180" x2="700" y2="180" />
      </g>
      <polyline fill={fill} stroke={stroke} strokeWidth="2" points={pts} />
    </svg>
  );
}
