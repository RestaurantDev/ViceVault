/**
 * DCA Engine Web Worker
 * 
 * Offloads heavy portfolio calculations to a Web Worker to keep the UI responsive.
 * Uses Comlink for type-safe RPC communication.
 */
import { expose } from "comlink";

/**
 * Price point from market data
 */
interface PricePoint {
  date: string;
  close: number;
}

/**
 * Portfolio value at a point in time
 */
interface PortfolioPoint {
  date: string;
  cashSpent: number;
  portfolioValue: number;
  sharesOwned: number;
}

/**
 * Result of the DCA calculation
 */
interface DCAResult {
  portfolio: PortfolioPoint[];
  summary: {
    totalCashSpent: number;
    currentValue: number;
    totalShares: number;
    gainLoss: number;
    gainLossPercent: number;
    cleanDaysCount: number;
    purchasesCount: number;
  };
}

type Frequency = "daily" | "weekly" | "biweekly" | "monthly";

/**
 * Check if a date matches the purchase frequency
 */
function shouldPurchaseOnDate(
  dateStr: string,
  frequency: Frequency,
  startDate: string
): boolean {
  const date = new Date(dateStr);
  const start = new Date(startDate);
  
  // Don't purchase before start date
  if (date < start) return false;
  
  switch (frequency) {
    case "daily":
      return true;
      
    case "weekly":
      // Purchase on the same day of week as start date
      return date.getDay() === start.getDay();
      
    case "biweekly":
      // Purchase every other week on the same day
      const weekDiff = Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return date.getDay() === start.getDay() && weekDiff % 2 === 0;
      
    case "monthly":
      // Purchase on the same day of month as start date
      return date.getDate() === start.getDate();
      
    default:
      return false;
  }
}

/**
 * Main DCA calculation function
 * 
 * This simulates what would have happened if the user invested their vice money
 * on each "clean day" according to their frequency.
 */
function calculateGhostPortfolio(
  history: PricePoint[],
  startDate: string,
  frequency: Frequency,
  amount: number,
  cleanDays: string[]
): DCAResult {
  // Create a Set for O(1) lookups
  const cleanDaysSet = new Set(cleanDays);
  
  let totalShares = 0;
  let totalCashSpent = 0;
  let purchasesCount = 0;
  
  const portfolio: PortfolioPoint[] = [];
  
  // Filter history to only include dates from start date onwards
  const relevantHistory = history.filter((point) => point.date >= startDate);
  
  for (const point of relevantHistory) {
    const dateStr = point.date;
    
    // Check if this day qualifies for a purchase:
    // 1. The date matches the frequency pattern
    // 2. The user logged this as a clean day
    const shouldPurchase = shouldPurchaseOnDate(dateStr, frequency, startDate) && 
                           cleanDaysSet.has(dateStr);
    
    if (shouldPurchase && point.close > 0) {
      const sharesToBuy = amount / point.close;
      totalShares += sharesToBuy;
      totalCashSpent += amount;
      purchasesCount++;
    }
    
    // Calculate current portfolio value
    const portfolioValue = totalShares * point.close;
    
    portfolio.push({
      date: dateStr,
      cashSpent: totalCashSpent,
      portfolioValue,
      sharesOwned: totalShares,
    });
  }
  
  // Calculate final summary
  const currentValue = portfolio.length > 0 
    ? portfolio[portfolio.length - 1].portfolioValue 
    : 0;
  const gainLoss = currentValue - totalCashSpent;
  const gainLossPercent = totalCashSpent > 0 
    ? (gainLoss / totalCashSpent) * 100 
    : 0;
  
  return {
    portfolio,
    summary: {
      totalCashSpent,
      currentValue,
      totalShares,
      gainLoss,
      gainLossPercent,
      cleanDaysCount: cleanDays.length,
      purchasesCount,
    },
  };
}

/**
 * Calculate "what if" scenario - if user had invested every scheduled day
 * (not just clean days). Used for showing potential vs actual.
 */
function calculatePotentialPortfolio(
  history: PricePoint[],
  startDate: string,
  frequency: Frequency,
  amount: number
): DCAResult {
  let totalShares = 0;
  let totalCashSpent = 0;
  let purchasesCount = 0;
  
  const portfolio: PortfolioPoint[] = [];
  
  const relevantHistory = history.filter((point) => point.date >= startDate);
  
  for (const point of relevantHistory) {
    const dateStr = point.date;
    
    // Purchase on every scheduled day (potential scenario)
    const shouldPurchase = shouldPurchaseOnDate(dateStr, frequency, startDate);
    
    if (shouldPurchase && point.close > 0) {
      const sharesToBuy = amount / point.close;
      totalShares += sharesToBuy;
      totalCashSpent += amount;
      purchasesCount++;
    }
    
    const portfolioValue = totalShares * point.close;
    
    portfolio.push({
      date: dateStr,
      cashSpent: totalCashSpent,
      portfolioValue,
      sharesOwned: totalShares,
    });
  }
  
  const currentValue = portfolio.length > 0 
    ? portfolio[portfolio.length - 1].portfolioValue 
    : 0;
  const gainLoss = currentValue - totalCashSpent;
  const gainLossPercent = totalCashSpent > 0 
    ? (gainLoss / totalCashSpent) * 100 
    : 0;
  
  return {
    portfolio,
    summary: {
      totalCashSpent,
      currentValue,
      totalShares,
      gainLoss,
      gainLossPercent,
      cleanDaysCount: purchasesCount,
      purchasesCount,
    },
  };
}

/**
 * Calculate monthly aggregates for cleaner chart display
 */
function aggregateByMonth(portfolio: PortfolioPoint[]): PortfolioPoint[] {
  const monthly: Map<string, PortfolioPoint> = new Map();
  
  for (const point of portfolio) {
    const monthKey = point.date.substring(0, 7); // YYYY-MM
    
    // Keep the last value for each month
    monthly.set(monthKey, {
      date: point.date,
      cashSpent: point.cashSpent,
      portfolioValue: point.portfolioValue,
      sharesOwned: point.sharesOwned,
    });
  }
  
  return Array.from(monthly.values());
}

// Expose functions for Comlink
const workerAPI = {
  calculateGhostPortfolio,
  calculatePotentialPortfolio,
  aggregateByMonth,
};

export type DCAWorkerAPI = typeof workerAPI;

expose(workerAPI);

