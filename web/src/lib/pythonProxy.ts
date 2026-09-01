import { NextResponse } from "next/server";

const PYTHON =
  process.env.SNAPSHOT_ONLY === "1"
    ? ""
    : process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

let pythonDownUntil = 0;

export async function proxyPython(req: Request, parts: string[]): Promise<NextResponse | null> {
  if (!PYTHON || Date.now() < pythonDownUntil) return null;
  const path = parts.join("/");
  const url = new URL(`/api/${path}`, PYTHON);
  url.search = new URL(req.url).search;
  const method = req.method.toUpperCase();
  const timeout = path.includes("ingest") ? 300_000 : 20_000;
  try {
    const res = await fetch(url, {
      method,
      headers: { "content-type": req.headers.get("content-type") || "application/json" },
      body: method === "GET" || method === "HEAD" ? undefined : await req.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
    const buf = await res.arrayBuffer();
    const headers = new Headers();
    const ct = res.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    return new NextResponse(buf, { status: res.status, headers });
  } catch {
    pythonDownUntil = Date.now() + 4000;
    return null;
  }
}
