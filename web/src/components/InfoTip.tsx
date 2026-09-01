"use client";

import { useEffect, useId, useRef, useState } from "react";

export function InfoTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-mist text-[11px] font-semibold text-muted hover:border-navy hover:text-navy"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-[min(280px,70vw)] -translate-x-1/2 rounded-2xl bg-navy px-3.5 py-3 text-[13px] font-normal leading-relaxed text-white shadow-float"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
