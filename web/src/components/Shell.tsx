import Link from "next/link";
import { NavTabs } from "@/components/NavTabs";
import { MacroBar } from "@/components/MacroBar";
import { getSnapshot } from "@/lib/store";

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#0B1F33" />
      <path d="M6 22h3v-7H6v7Zm5 0h3V8h-3v14Zm5 0h3v-10h-3v10Zm5 0h3v-5h-3v5Z" fill="#1FA97A" />
      <path d="M11 8h3v4h-3V8Z" fill="#E24B4A" />
      <path d="M6 24.5h20" stroke="#C9A227" strokeWidth="1.2" />
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const macros = getSnapshot().macros;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex h-[52px] items-center gap-6 bg-navy px-5 text-[#E8EEF4]">
        <Link href="/" className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.04em]">
          <BrandMark />
          STOCKPICKER <span className="font-normal text-gold">BR</span>
        </Link>
        <MacroBar initial={macros} />
        <div className="ml-auto text-[12px] text-white/70">Research desk · B3 delayed</div>
      </header>
      <div className="h-[3px] bg-gold" />
      <NavTabs />
      <main className="mx-auto w-full max-w-6xl px-5 py-5 pb-10">{children}</main>
    </div>
  );
}
