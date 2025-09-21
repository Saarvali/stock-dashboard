import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    finnhubKeyPresent: !!process.env.FINNHUB_API_KEY,
    alphaKeyPresent: !!process.env.ALPHAVANTAGE_API_KEY,
  });
}

