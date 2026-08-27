import Link from "next/link";
import { BandChip, Card, Disclaimer, Label, ScorePill, Sparkline } from "@/components/ui";
import { fmtNum, fmtPct } from "@/lib/api";
import { getSnapshot, getStore, listItem } from "@/lib/store";

export const dynamic = "force-dynamic";

function macroLabel(code: string, value?: number | null) {
  if (value == null) return "—";
  if (code === "USD_BRL") return fmtNum(value, 2);
  if (code === "CDI" && Math.abs(value) < 1) return `${fmtNum(value, 4)}% d`;
  if (code === "IPCA") return `${fmtNum(value, 2)}% m`;
  return `${fmtNum(value, 2)}%`;
}

export default function HomePage() {
  const snap = getSnapshot();
  const st = getStore();
  const macros = snap.macros;
  const watch = st.watchlist
    .map((t) => snap.stocks.find((s) => s.ticker === t))
    .filter(Boolean)
    .map((s) => listItem(s!));
  const featured = snap.stocks.find((s) => s.ticker === (watch[0]?.ticker || "PETR4")) || snap.stocks[0];
  const featuredItem = featured ? listItem(featured) : null;
  const buckets: Record<string, number[]> = {};
  for (const s of snap.stocks) {
    if (!s.score) continue;
    (buckets[s.sector] ||= []).push(s.score.composite);
  }
  const heat = Object.entries(buckets)
    .map(([sector, vals]) => ({
      sector,
      avg_score: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    }))
    .sort((a, b) => b.avg_score - a.avg_score);
  const news = snap.news.slice(0, 5);
  const selic = macros.find((m) => m.code === "SELIC");
  const usd = macros.find((m) => m.code === "USD_BRL");
  const ipca = macros.find((m) => m.code === "IPCA");
  const up = (featuredItem?.change_percent || 0) >= 0;

  return (
    <div>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.6fr_.9fr]">
        <Card title={`Price · ${featuredItem?.ticker || "—"}`} pad={false}>
          <Sparkline up={up} />
        </Card>
        <Card pad={false}>
          <div className="px-5 pt-5">
            <div className="text-[13px] text-muted">
              {featured?.name} · {featured?.sector}
            </div>
            <div className="mt-1 font-mono text-[36px] font-semibold leading-none text-navy">
              {fmtNum(featuredItem?.price)}{" "}
              <span className={`text-[16px] ${up ? "text-accent" : "text-down"}`}>
                {featuredItem?.change_percent == null
                  ? ""
                  : `${featuredItem.change_percent >= 0 ? "+" : ""}${fmtNum(featuredItem.change_percent, 2)}%`}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-muted">
              Decision score {featuredItem?.composite != null ? Math.round(featuredItem.composite) : "—"} ·{" "}
              {featuredItem?.band || "—"}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line px-5 py-4 text-[13px]">
            {[
              ["P/L", fmtNum(featured?.indicators?.pe, 1)],
              ["P/VP", fmtNum(featured?.indicators?.pb, 1)],
              ["ROE", fmtPct(featured?.indicators?.roe, 0)],
              ["Div. yield", fmtPct(featured?.indicators?.dividend_yield, 0)],
              ["Moat", featured?.score?.moat != null ? fmtNum(featured.score.moat, 0) : "—"],
              ["Macro fit", featured?.score?.macro_fit != null ? fmtNum(featured.score.macro_fit, 0) : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-muted">{k}</span>
                <b className="float-right font-mono font-medium">{v}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <Label>Selic</Label>
          <div className="font-mono text-[26px] font-medium">{macroLabel("SELIC", selic?.value)}</div>
          <div className="mt-1 text-[13px] text-muted">meta · BCB</div>
        </Card>
        <Card>
          <Label>USD / BRL</Label>
          <div className="font-mono text-[26px] font-medium">{macroLabel("USD_BRL", usd?.value)}</div>
          <div className="mt-1 text-[13px] text-muted">PTAX venda</div>
        </Card>
        <Card>
          <Label>IPCA</Label>
          <div className="font-mono text-[26px] font-medium">{macroLabel("IPCA", ipca?.value)}</div>
          <div className="mt-1 text-[13px] text-muted">{ipca?.date || "monthly"}</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_.9fr]">
        <Card title="Watchlist" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-4 py-2.5 font-medium">Ticker</th>
                  <th className="px-4 py-2.5 font-medium">Price</th>
                  <th className="px-4 py-2.5 font-medium">Day</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Band</th>
                </tr>
              </thead>
              <tbody>
                {watch.map((w) => (
                  <tr key={w.ticker} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <Link href={`/stocks/${w.ticker}`} className="font-mono hover:text-accent">
                        {w.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{fmtNum(w.price)}</td>
                    <td className={`px-4 py-2.5 font-mono ${(w.change_percent || 0) >= 0 ? "text-accent" : "text-down"}`}>
                      {w.change_percent == null
                        ? "—"
                        : `${w.change_percent >= 0 ? "+" : ""}${fmtNum(w.change_percent, 2)}%`}
                    </td>
                    <td className="px-4 py-2.5">
                      <ScorePill value={w.composite} />
                    </td>
                    <td className="px-4 py-2.5">
                      <BandChip band={w.band} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Sector heat">
            <ul className="space-y-2.5">
              {heat.slice(0, 6).map((s) => (
                <li key={s.sector} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{s.sector}</span>
                  <ScorePill value={s.avg_score} />
                </li>
              ))}
            </ul>
          </Card>
          <Card title="News">
            <ul className="space-y-3">
              {news.map((n, i) => (
                <li key={i} className="text-[13px]">
                  <a href={String(n.url || "#")} target="_blank" rel="noreferrer" className="leading-snug hover:text-accent">
                    {String(n.title)}
                  </a>
                  <div className="mt-0.5 text-[11px] text-faint">{String(n.source || "")}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Disclaimer text={snap.disclaimer} />
    </div>
  );
}
