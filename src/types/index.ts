import type { Frequency, AssetSymbol } from "@/lib/constants";

/**
 * Historical price point from Yahoo Finance
 */
export interface HistoricalPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

/**
 * Simplified historical data for DCA calculations
 */
export interface PricePoint {
  date: string; // ISO date string
  close: number;
}

/**
 * Portfolio value at a point in time
 */
export interface PortfolioPoint {
  date: string;
  cashSpent: number;
  portfolioValue: number;
  sharesOwned: number;
}

/**
 * Parsed transaction from bank statement
 */
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

/**
 * Vice configuration
 */
export interface ViceConfig {
  name: string;
  amount: number;
  frequency: Frequency;
}

/**
 * Individual vice entry with unique ID
 */
export interface Vice {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  icon?: string; // Lucide icon name
  color?: string; // For chart visualization
  createdAt: string; // ISO date
  isActive: boolean; // Can be paused
}

/**
 * User's financial profile
 */
export interface FinancialProfile {
  netIncome: number;
  fixedCosts: number;
}

/**
 * Subscription status
 */
export type SubscriptionStatus = "active" | "canceled" | "none" | "pending";

/**
 * Zustand store state
 */
export interface ViceState {
  // Identity (Stripe)
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  
  // Vice Configuration (Legacy - single vice for backwards compat)
  viceName: string;
  viceAmount: number;
  frequency: Frequency;
  startDate: string; // ISO date
  
  // Multi-Vice Support (v2)
  vices: Vice[];
  
  // Streak Tracking
  cleanDays: string[]; // Array of ISO dates user stayed clean
  
  // Pro Features
  streakFreezes: number; // Number of streak freezes remaining this month
  lastStreakFreezeReset: string; // ISO date of last reset
  
  // Portfolio Settings
  selectedAsset: AssetSymbol;
  
  // Budget
  netIncome: number;
  fixedCosts: number;
  
  // Cached market data
  marketDataCache: Record<string, PricePoint[]>;
  lastFetchedAt: Record<string, number>;
}

/**
 * Zustand store actions
 */
export interface ViceActions {
  // Legacy vice management (for backwards compat)
  setVice: (name: string, amount: number, frequency: Frequency) => void;
  setStartDate: (date: string) => void;
  
  // Multi-Vice management
  addVice: (vice: Omit<Vice, "id" | "createdAt">) => void;
  updateVice: (id: string, updates: Partial<Vice>) => void;
  removeVice: (id: string) => void;
  toggleVice: (id: string) => void; // Pause/resume
  
  // Streak tracking
  logCleanDay: () => void;
  removeCleanDay: (date: string) => void;
  useStreakFreeze: () => boolean; // Returns true if freeze was available
  
  // Portfolio
  setAsset: (ticker: AssetSymbol) => void;
  
  // Subscription
  setSubscription: (id: string, status: SubscriptionStatus) => void;
  clearSubscription: () => void;
  
  // Budget
  setFinancials: (netIncome: number, fixedCosts: number) => void;
  
  // Market data cache
  cacheMarketData: (symbol: string, data: PricePoint[]) => void;
  
  // Computed helpers
  getTotalViceAmount: () => number;
  getActiveVices: () => Vice[];
  
  // Reset
  reset: () => void;
}

/**
 * Complete store type
 */
export type ViceStore = ViceState & ViceActions;

/**
 * DCA calculation result summary
 */
export interface PortfolioSummary {
  totalCashSpent: number;
  currentValue: number;
  totalShares: number;
  gainLoss: number;
  gainLossPercent: number;
  cleanDaysCount: number;
}

/**
 * Cash flow analysis
 */
export interface CashFlowAnalysis {
  disposableIncome: number;
  strangulationRatio: number;
  freedomRunway: number;
  annualViceCost: number;
}

