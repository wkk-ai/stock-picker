"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Home",
    icon: (
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    ),
  },
  {
    href: "/screener",
    label: "Filter",
    icon: (
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    ),
  },
  {
    href: "/portfolio",
    label: "Wallet",
    icon: (
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5v-9Zm14 4.5h.01" />
    ),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: (
      <path d="M12 4a6 6 0 0 1 6 6v3.2l1.2 2.4H4.8L6 13.2V10a6 6 0 0 1 6-6Zm-2.2 14a2.2 2.2 0 0 0 4.4 0" />
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    icon: (
      <path d="M7 19V5m0 0 3 3M7 5 4 8m13 11V5m0 14 3-3m-3 3-3-3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy pb-[var(--safe-bottom)] md:hidden"
      aria-label="Main"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const on = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${
                  on ? "text-gold" : "text-white/70"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
