"use client";

import { useEffect, useState } from "react";
import { api, fmtNum, type MacroItem } from "@/lib/api";

export function MacroBar({ initial }: { initial: MacroItem[] }) {
  const [macros, setMacros] = useState(initial);

  useEffect(() => {
    api
      .macros()
      .then((d) => {
        if (d.items?.length) setMacros(d.items);
      })
      .catch(() => undefined);
  }, []);

  const usd = macros.find((m) => m.code === "USD_BRL");
  const selic = macros.find((m) => m.code === "SELIC");

  return (
    <div className="hidden font-mono text-[13px] text-[#9DFFC2] sm:block">
      USD {usd?.value != null ? fmtNum(usd.value, 2) : "—"}
      {selic?.value != null ? <span className="ml-4 text-[#E8EEF4]/80">SELIC {fmtNum(selic.value, 2)}%</span> : null}
    </div>
  );
}
