"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { wrap, type Remote } from "comlink";
import type { DCAWorkerAPI } from "@/workers/dca-engine.worker";
import type { PricePoint, PortfolioPoint } from "@/types";
import type { Frequency } from "@/lib/constants";

export interface PortfolioSummary {
  totalCashSpent: number;
  currentValue: number;
  totalShares: number;
  gainLoss: number;
  gainLossPercent: number;
  cleanDaysCount: number;
  purchasesCount: number;
}

interface PortfolioData {
  portfolio: PortfolioPoint[];
  summary: PortfolioSummary | null;
}

/**
 * Dual Portfolio Result - always returns both actual progress and 1-year projection
 */
export interface DualPortfolioResult {
  actual: PortfolioData;
  projection: PortfolioData;
  isCalculating: boolean;
  error: string | null;
}

/**
 * Calculate simulated start date (1 year ago) for projection
 */
function getProjectionStartDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split("T")[0];
}

/**
 * Hook to calculate BOTH actual portfolio AND 1-year projection
 * 
 * This "Dual View" approach ensures users always see:
 * 1. Their ACTUAL progress (based on real clean days)
 * 2. Their 1-YEAR POTENTIAL (what they could achieve if consistent)
 * 
 * This maintains motivation and prevents the "deflation" when 
 * transitioning from simulation to real data.
 */
export function useDCACalculation(
  history: PricePoint[] | null,
  startDate: string,
  frequency: Frequency,
  amount: number,
  cleanDays: string[]
): DualPortfolioResult {
  // Actual portfolio state
  const [actualPortfolio, setActualPortfolio] = useState<PortfolioPoint[]>([]);
  const [actualSummary, setActualSummary] = useState<PortfolioSummary | null>(null);
  
  // Projection portfolio state (1-year potential)
  const [projectionPortfolio, setProjectionPortfolio] = useState<PortfolioPoint[]>([]);
  const [projectionSummary, setProjectionSummary] = useState<PortfolioSummary | null>(null);
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Worker reference
  const workerRef = useRef<Worker | null>(null);
  const workerAPIRef = useRef<Remote<DCAWorkerAPI> | null>(null);
  
  // Initialize worker
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      workerRef.current = new Worker(
        new URL("../workers/dca-engine.worker.ts", import.meta.url)
      );
      workerAPIRef.current = wrap<DCAWorkerAPI>(workerRef.current);
    } catch (err) {
      console.error("Failed to initialize DCA worker:", err);
      setError("Failed to initialize calculation engine");
    }
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  // Memoize inputs to prevent unnecessary recalculations
  const cleanDaysKey = useMemo(() => cleanDays.join(","), [cleanDays]);
  
  // Calculate BOTH portfolios when inputs change
  useEffect(() => {
    // Must have history data and worker ready
    if (!history?.length || !workerAPIRef.current) {
      setActualPortfolio([]);
      setActualSummary(null);
      setProjectionPortfolio([]);
      setProjectionSummary(null);
      return;
    }
    
    // If amount is 0 or less, show empty (user hasn't set up vice yet)
    if (amount <= 0) {
      setActualPortfolio([]);
      setActualSummary(null);
      setProjectionPortfolio([]);
      setProjectionSummary(null);
      return;
    }
    
    let cancelled = false;
    
    async function calculate() {
      setIsCalculating(true);
      setError(null);
      
      try {
        // Calculate BOTH in parallel for better performance
        const projectionStartDate = getProjectionStartDate();
        
        // For ACTUAL portfolio, we use the projection start date (1 year ago)
        // but limit purchases to the NUMBER of clean days logged.
        // This shows: "If you had been doing this for a year with N clean days..."
        // This provides meaningful data even for new users.
        const actualStartDate = projectionStartDate;
        
        const [actualResult, projectionResult] = await Promise.all([
          // ACTUAL: Simulates N purchases (where N = clean days count) over the past year
          cleanDays.length > 0
            ? workerAPIRef.current!.calculateGhostPortfolio(
                history!,
                actualStartDate,
                frequency,
                amount,
                cleanDays
              )
            : Promise.resolve({ portfolio: [], summary: null }),
          
          // PROJECTION: What they could achieve in 1 year if consistent
          workerAPIRef.current!.calculatePotentialPortfolio(
            history!,
            projectionStartDate,
            frequency,
            amount
          ),
        ]);
        
        if (!cancelled) {
          // Set actual (may be empty if no clean days)
          setActualPortfolio(actualResult.portfolio);
          setActualSummary(actualResult.summary);
          
          // Set projection
          setProjectionPortfolio(projectionResult.portfolio);
          setProjectionSummary(projectionResult.summary);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("DCA calculation error:", err);
          setError("Failed to calculate portfolio");
        }
      } finally {
        if (!cancelled) {
          setIsCalculating(false);
        }
      }
    }
    
    calculate();
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, startDate, frequency, amount, cleanDaysKey]);
  
  return {
    actual: {
      portfolio: actualPortfolio,
      summary: actualSummary,
    },
    projection: {
      portfolio: projectionPortfolio,
      summary: projectionSummary,
    },
    isCalculating,
    error,
  };
}

/**
 * Hook to fetch and cache market data with fallback support
 * 
 * Shows fallback data immediately for instant gratification,
 * then updates with real data when available.
 */
export function useMarketData(symbol: string) {
  // Import fallback data dynamically to avoid circular deps
  const [fallbackData, setFallbackData] = useState<PricePoint[] | null>(null);
  const [data, setData] = useState<PricePoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  // Load fallback data on mount
  useEffect(() => {
    import("@/lib/fallback-data").then(({ getFallbackData }) => {
      const fallback = getFallbackData(symbol);
      setFallbackData(fallback);
      
      // Set fallback as initial data for instant display
      if (fallback && !data) {
        setData(fallback);
        setIsUsingFallback(true);
        setIsLoading(false);
      }
    });
  }, [symbol, data]);
  
  // Fetch real data in background
  useEffect(() => {
    if (!symbol) return;
    
    let cancelled = false;
    
    async function fetchData() {
      // Don't show loading if we have fallback
      if (!fallbackData) {
        setIsLoading(true);
      }
      setError(null);
      
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`/api/market-history?symbol=${symbol}`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error("Failed to fetch market data");
        }
        
        const result = await response.json();
        
        if (!cancelled && result.data?.length) {
          setData(result.data);
          setIsUsingFallback(false);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("Market data fetch failed, using fallback:", e);
          
          // If we have fallback, use it silently
          if (fallbackData) {
            setData(fallbackData);
            setIsUsingFallback(true);
          } else {
            setError("Market data unavailable. Try SPY, QQQ, or BTC-USD.");
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [symbol, fallbackData]);
  
  return { data, isLoading, error, isUsingFallback };
}
