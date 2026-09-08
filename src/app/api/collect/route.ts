import { NextResponse } from "next/server";
import { collectAllRssSources } from "@/lib/collectors/rss";

export const maxDuration = 60;

export async function GET() {
  try {
    const results = await collectAllRssSources();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
