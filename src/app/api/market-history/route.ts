import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

// Use Node.js runtime for yahoo-finance2 compatibility
export const runtime = "nodejs";

// Revalidate every 24 hours
export const revalidate = 86400;

/**
 * Supported symbols whitelist (prevent abuse)
 */
const ALLOWED_SYMBOLS = new Set([
  "SPY",
  "QQQ",
  "BTC-USD",
  "ETH-USD",
  "AAPL",
  "TSLA",
  "NVDA",
  "SHV",
]);

interface HistoricalRow {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

/**
 * GET /api/market-history?symbol=SPY
 * 
 * Fetches 5 years of daily historical data for DCA backtesting.
 * Edge-cached for 24 hours to ensure $0 API cost at scale.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.toUpperCase() || "SPY";

    // Validate symbol against whitelist
    if (!ALLOWED_SYMBOLS.has(symbol)) {
      return NextResponse.json(
        { error: "Invalid symbol. Supported: SPY, QQQ, BTC-USD, ETH-USD, AAPL, TSLA, NVDA, SHV" },
        { status: 400 }
      );
    }

    // Calculate date range (5 years back)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);

    // Fetch historical data from Yahoo Finance
    const history = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    }) as HistoricalRow[];

    // Transform to simplified format for client
    const data = history.map((point) => ({
      date: point.date.toISOString().split("T")[0],
      close: point.close,
    }));

    // Return with aggressive caching headers
    return NextResponse.json(
      {
        symbol,
        count: data.length,
        startDate: data[0]?.date,
        endDate: data[data.length - 1]?.date,
        data,
      },
      {
        headers: {
          // Edge cache for 24 hours, stale-while-revalidate for 1 hour
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
          // CORS headers for client-side fetching
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Market history fetch error:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch market data. Please try again later." },
      { status: 500 }
    );
  }
}
