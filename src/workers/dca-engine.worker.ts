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
 * consistently based on the NUMBER of clean days they've logged.
 * 
 * Logic: User has logged N clean days. We simulate investing on the first N
 * frequency-matching dates from the start date, showing what the portfolio
 * would be worth today.
 */
function calculateGhostPortfolio(
  history: PricePoint[],
  startDate: string,
  frequency: Frequency,
  amount: number,
  cleanDays: string[]
): DCAResult {
  const numCleanDays = cleanDays.length;
  
  if (numCleanDays === 0) {
    return {
      portfolio: [],
      summary: {
        totalCashSpent: 0,
        currentValue: 0,
        totalShares: 0,
        gainLoss: 0,
        gainLossPercent: 0,
        cleanDaysCount: 0,
        purchasesCount: 0,
      },
    };
  }
  
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
    // 2. We haven't used up all our clean days yet
    const shouldPurchase = shouldPurchaseOnDate(dateStr, frequency, startDate) && 
                           purchasesCount < numCleanDays;
    
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
      cleanDaysCount: numCleanDays,
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

