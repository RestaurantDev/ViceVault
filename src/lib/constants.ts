/**
 * Supported assets for DCA backtesting
 */
export const SUPPORTED_ASSETS = [
  // Indices
  { symbol: "SPY", name: "S&P 500", category: "Indices" },
  { symbol: "QQQ", name: "Nasdaq 100", category: "Indices" },
  
  // Crypto
  { symbol: "BTC-USD", name: "Bitcoin", category: "Crypto" },
  { symbol: "ETH-USD", name: "Ethereum", category: "Crypto" },
  
  // High Growth
  { symbol: "AAPL", name: "Apple", category: "High Growth" },
  { symbol: "TSLA", name: "Tesla", category: "High Growth" },
  { symbol: "NVDA", name: "NVIDIA", category: "High Growth" },
  
  // Safe
  { symbol: "SHV", name: "US Treasury Bills", category: "Safe" },
] as const;

// Alias for convenience
export const ASSETS = SUPPORTED_ASSETS;

export type AssetSymbol = typeof SUPPORTED_ASSETS[number]["symbol"];

/**
 * Frequency options for vice tracking
 */
export const FREQUENCIES = [
  { value: "daily", label: "Daily", multiplier: 365 },
  { value: "weekly", label: "Weekly", multiplier: 52 },
  { value: "biweekly", label: "Bi-Weekly", multiplier: 26 },
  { value: "monthly", label: "Monthly", multiplier: 12 },
] as const;

export type Frequency = typeof FREQUENCIES[number]["value"];

/**
 * Common vice presets for quick selection
 */
export const VICE_PRESETS = [
  { name: "Cigarettes", icon: "Cigarette", defaultAmount: 15, defaultFrequency: "daily" as Frequency },
  { name: "Alcohol", icon: "Wine", defaultAmount: 50, defaultFrequency: "weekly" as Frequency },
  { name: "Coffee", icon: "Coffee", defaultAmount: 7, defaultFrequency: "daily" as Frequency },
  { name: "Fast Food", icon: "Utensils", defaultAmount: 15, defaultFrequency: "weekly" as Frequency },
  { name: "Gambling", icon: "Dices", defaultAmount: 100, defaultFrequency: "weekly" as Frequency },
  { name: "Shopping", icon: "ShoppingBag", defaultAmount: 150, defaultFrequency: "monthly" as Frequency },
  { name: "Subscriptions", icon: "Tv", defaultAmount: 50, defaultFrequency: "monthly" as Frequency },
  { name: "Cannabis", icon: "Leaf", defaultAmount: 60, defaultFrequency: "weekly" as Frequency },
] as const;

/**
 * Stripe pricing
 */
export const PRICING = {
  monthly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || "",
    amount: 5,
    label: "Monthly",
    tagline: "Trade 1 Beer",
  },
  annual: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || "",
    amount: 25,
    label: "Annual",
    tagline: "Founder's Club - 5 Months Free",
  },
} as const;

/**
 * Design system colors (for programmatic use)
 */
export const COLORS = {
  canvas: "#EDEDED",
  structure: "#133250",
  alpha: "#80B5D7",
  risk: "#F43F5E",
  surface: "#FFFFFF",
} as const;

/**
 * Chart configuration
 */
export const CHART_CONFIG = {
  cashLine: {
    stroke: COLORS.structure,
    strokeDasharray: "5 5",
    strokeWidth: 2,
  },
  portfolioLine: {
    stroke: COLORS.alpha,
    strokeWidth: 3,
    fill: `${COLORS.alpha}20`,
  },
  grid: {
    stroke: `${COLORS.structure}10`,
  },
} as const;

/**
 * Animation durations (ms)
 */
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  chart: 1500,
} as const;

