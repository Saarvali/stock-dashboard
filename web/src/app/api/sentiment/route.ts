// src/app/api/sentiment/route.ts
import { NextRequest } from "next/server";
import { getNewsSentiment } from "@/lib/news";
import { getRedditSentiment } from "@/lib/reddit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();

    if (!symbol) {
      return new Response(JSON.stringify({ error: "Missing ?symbol" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Fail-safe if keys missing (still return 0s instead of 500)
    const hasFinnhub = !!process.env.FINNHUB_API_KEY;

    // Compute in parallel
    const [news, reddit] = await Promise.all([
      hasFinnhub ? getNewsSentiment(symbol) : Promise.resolve(0),
      hasFinnhub ? getRedditSentiment(symbol) : Promise.resolve(0),
    ]);

    return new Response(JSON.stringify({ symbol, news, reddit }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        // cache client-side a bit; server can revalidate as needed
        "cache-control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Sentiment route failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
