import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// Use Node.js runtime for yahoo-finance2 compatibility
export const runtime = "nodejs";

// Revalidate every 24 hours
export const revalidate = 86400;

// Initialize yahoo-finance2 v3 instance with suppressed deprecation notices
const yahooFinance = new YahooFinance({ 
  suppressNotices: ["ripHistorical"] 
});

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

/**
 * GET /api/market-history?symbol=SPY
 * 
 * Fetches 5 years of daily historical data for DCA backtesting.
 * Uses yahoo-finance2 v3 chart() API - public endpoints, no API key required.
 * Edge-cached for 24 hours to ensure $0 API cost at scale.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() || "SPY";

  // Validate symbol against whitelist
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json(
      { error: "Invalid symbol. Supported: SPY, QQQ, BTC-USD, ETH-USD, AAPL, TSLA, NVDA, SHV" },
      { status: 400 }
    );
  }

  try {
    // Calculate 5 years back
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const period1 = fiveYearsAgo.toISOString().split("T")[0];

    // Fetch chart data using v3 API - no API key needed
    const result = await yahooFinance.chart(symbol, {
      period1,
      interval: "1d",
    });

    // Extract quotes from chart response
    const quotes = result.quotes || [];
    
    // Transform to simplified format for client
    const data = quotes.map((point) => ({
      date: new Date(point.date).toISOString().split("T")[0],
      close: point.close,
    })).filter((point) => point.close !== null && point.close !== undefined);

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
    console.error("Yahoo Finance error:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch market data. Please try again later." },
      { status: 500 }
    );
  }
}
