"use client";

import { useEffect, useState } from "react";
import { api, fmtNum, type MacroItem } from "@/lib/api";
import { InfoTip } from "./InfoTip";
import { GLOSSARY } from "@/lib/glossary";

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
    <div className="flex items-center gap-3 font-mono text-[12px] text-[#9DFFC2] sm:text-[13px]">
      <span className="inline-flex items-center">
        USD {usd?.value != null ? fmtNum(usd.value, 2) : "—"}
        <span className="hidden sm:inline">
          <InfoTip label="USD/BRL">{GLOSSARY.usd_brl.short}</InfoTip>
        </span>
      </span>
      {selic?.value != null ? (
        <span className="text-[#E8EEF4]/85">
          SELIC {fmtNum(selic.value, 2)}%
        </span>
      ) : null}
    </div>
  );
}
