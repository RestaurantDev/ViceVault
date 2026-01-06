/**
 * Static Fallback Data for Instant Gratification
 * 
 * This provides realistic market data when the Yahoo Finance API is slow or down.
 * Users see a chart immediately, then it updates with real data when available.
 */

import type { PricePoint } from "@/types";

/**
 * Generate realistic SPY price data using a random walk with upward drift
 * This mimics real market behavior for demo purposes
 */
function generateSPYFallback(): PricePoint[] {
  const data: PricePoint[] = [];
  const today = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 5);
  
  // SPY was around $380 in early 2020, now around $580
  let price = 380;
  
  // Use a seeded random for consistency across renders
  const seed = 42;
  let seedState = seed;
  const seededRandom = () => {
    seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
    return seedState / 0x7fffffff;
  };
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= today) {
    // Skip weekends (markets closed)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Daily return: slight upward bias (0.03% daily ≈ 8% annual)
      const dailyReturn = (seededRandom() - 0.47) * 0.018;
      price = price * (1 + dailyReturn);
      
      // Clamp to realistic range for SPY
      price = Math.max(280, Math.min(620, price));
      
      data.push({
        date: currentDate.toISOString().split("T")[0],
        close: Math.round(price * 100) / 100,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

/**
 * Generate realistic BTC-USD price data
 */
function generateBTCFallback(): PricePoint[] {
  const data: PricePoint[] = [];
  const today = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 5);
  
  // BTC was around $10,000 in early 2020
  let price = 10000;
  
  const seed = 123;
  let seedState = seed;
  const seededRandom = () => {
    seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
    return seedState / 0x7fffffff;
  };
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= today) {
    // BTC trades 24/7 but we'll still skip weekends for consistency
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // BTC is more volatile
      const dailyReturn = (seededRandom() - 0.45) * 0.04;
      price = price * (1 + dailyReturn);
      
      price = Math.max(5000, Math.min(100000, price));
      
      data.push({
        date: currentDate.toISOString().split("T")[0],
        close: Math.round(price * 100) / 100,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

/**
 * Generate realistic QQQ (Nasdaq 100) data
 */
function generateQQQFallback(): PricePoint[] {
  const data: PricePoint[] = [];
  const today = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 5);
  
  let price = 200; // QQQ was around $200 in early 2020
  
  const seed = 789;
  let seedState = seed;
  const seededRandom = () => {
    seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
    return seedState / 0x7fffffff;
  };
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= today) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // QQQ is slightly more volatile than SPY
      const dailyReturn = (seededRandom() - 0.46) * 0.022;
      price = price * (1 + dailyReturn);
      
      price = Math.max(150, Math.min(550, price));
      
      data.push({
        date: currentDate.toISOString().split("T")[0],
        close: Math.round(price * 100) / 100,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

// Pre-generate fallback data (computed once on module load)
export const FALLBACK_DATA: Record<string, PricePoint[]> = {
  SPY: generateSPYFallback(),
  QQQ: generateQQQFallback(),
  "BTC-USD": generateBTCFallback(),
};

/**
 * Check if the data is stale (last data point is more than 7 days old)
 */
export function isDataStale(data: PricePoint[]): boolean {
  if (!data.length) return true;
  
  const lastDate = new Date(data[data.length - 1].date);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffDays > 7;
}

/**
 * Get fallback data for a symbol, or null if not available
 */
export function getFallbackData(symbol: string): PricePoint[] | null {
  return FALLBACK_DATA[symbol] || null;
}

