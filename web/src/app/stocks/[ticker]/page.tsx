import snapshot from "@/data/snapshot.json";
import { stockDetailPayload } from "@/lib/research";
import { StockDesk } from "./StockDesk";

export function generateStaticParams() {
  return snapshot.stocks.map((s) => ({ ticker: s.ticker }));
}

export const dynamicParams = false;

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const initial = stockDetailPayload(ticker);
  return <StockDesk ticker={ticker} initial={initial as never} />;
}
