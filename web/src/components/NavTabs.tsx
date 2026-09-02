"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/screener", label: "Screener" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/alerts", label: "Alerts" },
  { href: "/compare", label: "Compare" },
];

export function NavTabs() {
  const path = usePathname();
  return (
    <nav className="hidden gap-1 overflow-x-auto border-b border-line bg-elev px-5 md:flex" aria-label="Desk">
      {links.map((l) => {
        const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap px-3.5 py-3 text-[13px] ${
              on ? "border-b-2 border-gold font-semibold text-navy" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
