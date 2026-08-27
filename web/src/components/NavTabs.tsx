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
    <nav className="flex gap-1 overflow-x-auto bg-elev px-5 border-b border-line">
      {links.map((l) => {
        const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap px-3.5 py-3 text-[13px] ${
              on ? "font-semibold text-navy border-b-2 border-gold" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
