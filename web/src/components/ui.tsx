import { InfoTip } from "./InfoTip";

export function Card({
  children,
  className = "",
  title,
  pad = true,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  pad?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-card border border-line bg-elev shadow-card ${className}`}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </div>
  );
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center text-[11px] uppercase tracking-[0.1em] text-muted">
      {children}
      {hint ? <InfoTip label={String(children)}>{hint}</InfoTip> : null}
    </div>
  );
}

export function PageHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-[24px] font-semibold tracking-tight text-navy md:text-[26px]">{title}</h1>
      {subtitle ? <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function ScorePill({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-faint">—</span>;
  const tone =
    value >= 75 ? "bg-soft text-accent" : value >= 55 ? "bg-[#FDF0E7] text-watch" : "bg-red-50 text-down";
  return (
    <span className={`inline-flex min-w-10 items-center justify-center rounded-pill px-2.5 py-0.5 font-mono text-[13px] ${tone}`}>
      {Math.round(value)}
    </span>
  );
}

export function BandChip({ band }: { band?: string | null }) {
  if (!band) return null;
  const tone =
    band === "Attractive"
      ? "bg-soft text-accent"
      : band === "Avoid"
        ? "bg-red-50 text-down"
        : band === "Fair"
          ? "bg-mist text-navy"
          : "bg-[#FDF0E7] text-watch";
  return (
    <span className={`inline-block rounded-pill px-2.5 py-0.5 text-[11px] tracking-wide ${tone}`}>
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

export function Field({
  id,
  label,
  hint,
  className = "",
  children,
}: {
  id?: string;
  label: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 flex items-center text-[12px] text-muted">
        {label}
        {hint ? <InfoTip label={label}>{hint}</InfoTip> : null}
      </label>
      {children}
    </div>
  );
}

export function Sparkline({ up = true }: { up?: boolean }) {
  const pts = up
    ? "0,170 50,160 100,150 150,155 210,120 270,128 330,96 390,108 450,78 520,88 600,62 700,48"
    : "0,70 50,82 100,96 150,90 210,120 270,112 330,138 390,130 450,158 520,150 600,176 700,188";
  const stroke = up ? "#0F7A4A" : "#B42318";
  const fill = up ? "url(#upFill)" : "url(#dnFill)";
  return (
    <svg viewBox="0 0 700 220" className="block h-[88px] w-full md:h-[160px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="upFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F7A4A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0F7A4A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dnFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B42318" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#B42318" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${pts} L700,220 L0,220 Z`} fill={fill} />
      <polyline fill="none" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export function Flash({ text, tone = "ok" }: { text?: string; tone?: "ok" | "err" | "info" }) {
  if (!text) return null;
  const cls = tone === "err" ? "text-down" : tone === "info" ? "text-muted" : "text-accent";
  return (
    <p className={`mt-2 text-[13px] ${cls}`} role="status">
      {text}
    </p>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tap inline-flex items-center justify-center bg-navy px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-90 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tap inline-flex items-center justify-center border border-line bg-elev px-4 py-2.5 text-[14px] text-ink hover:border-navy disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
