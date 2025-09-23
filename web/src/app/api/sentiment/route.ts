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

    const hasFinnhub = Boolean(process.env.FINNHUB_API_KEY);

    const [news, reddit] = await Promise.all([
      hasFinnhub ? getNewsSentiment(symbol) : Promise.resolve(0),
      hasFinnhub ? getRedditSentiment(symbol) : Promise.resolve(0),
    ]);

    return new Response(JSON.stringify({ symbol, news, reddit }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Sentiment route failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
