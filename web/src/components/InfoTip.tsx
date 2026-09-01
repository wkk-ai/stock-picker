"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export function InfoTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [below, setBelow] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const top = ref.current.getBoundingClientRect().top;
    setBelow(top < 150);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        className="tap ml-0.5 inline-flex items-center justify-center text-[11px] font-semibold text-muted hover:text-navy"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-mist">i</span>
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={`absolute right-0 z-50 w-[min(260px,calc(100vw-2.5rem))] rounded-2xl bg-navy px-3.5 py-3 text-left text-[13px] font-normal leading-relaxed text-white shadow-float ${
            below ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"
          }`}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
