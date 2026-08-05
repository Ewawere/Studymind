import { NextResponse } from "next/server";
import { health, liveness, readiness } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("type") ?? "health";

  if (mode === "live" || mode === "liveness") {
    return NextResponse.json(await liveness());
  }
  if (mode === "ready" || mode === "readiness") {
    const report = await readiness();
    return NextResponse.json(report, {
      status: report.status === "down" ? 503 : 200,
    });
  }

  const report = await health();
  return NextResponse.json(report, {
    status: report.status === "down" ? 503 : 200,
  });
}
