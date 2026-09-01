import Link from "next/link";
import { NavTabs } from "@/components/NavTabs";
import { MacroBar } from "@/components/MacroBar";
import { BottomNav } from "@/components/BottomNav";
import { getSnapshot } from "@/lib/store";

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="10" fill="#10263C" />
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
      <header className="sticky top-0 z-30 bg-navy pt-[var(--safe-top)] text-[#E8EEF4]">
        <div className="flex h-12 items-center gap-3 px-4 md:h-[52px] md:gap-6 md:px-5">
          <Link href="/" className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.04em]">
            <BrandMark />
            <span className="hidden sm:inline">STOCKPICKER </span>
            <span className="font-normal text-gold">BR</span>
          </Link>
          <MacroBar initial={macros} />
          <div className="hidden text-[12px] text-white/70 md:block">Research desk · B3 delayed</div>
        </div>
        <div className="h-[3px] bg-gold" />
      </header>
      <NavTabs />
      <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-[calc(5.5rem+var(--safe-bottom))] md:px-5 md:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
