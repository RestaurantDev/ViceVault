"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { wrap, type Remote } from "comlink";
import type { DCAWorkerAPI } from "@/workers/dca-engine.worker";
import type { PricePoint, PortfolioPoint } from "@/types";
import type { Frequency } from "@/lib/constants";

interface PortfolioSummary {
  totalCashSpent: number;
  currentValue: number;
  totalShares: number;
  gainLoss: number;
  gainLossPercent: number;
  cleanDaysCount: number;
  purchasesCount: number;
}

interface DCACalculationResult {
  portfolio: PortfolioPoint[];
  summary: PortfolioSummary | null;
  isCalculating: boolean;
  error: string | null;
  isSimulation?: boolean;
  simulationStartDate?: string;
}

/**
 * Calculate simulated start date (1 year ago) for new user demo
 */
function getSimulatedStartDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split("T")[0];
}

/**
 * Check if user is "new" (should see simulation mode)
 */
function shouldUseSimulation(startDate: string, cleanDays: string[]): boolean {
  if (!startDate) return true;
  
  const start = new Date(startDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use simulation if user has been tracking < 30 days AND has < 5 clean days
  return daysSinceStart < 30 && cleanDays.length < 5;
}

/**
 * Hook to calculate DCA portfolio using Web Worker
 * 
 * Offloads heavy computation to a Web Worker to prevent UI freezing.
 * For new users (< 30 days, < 5 clean days), shows a simulation of
 * what their portfolio COULD be if they had started 1 year ago.
 */
export function useDCACalculation(
  history: PricePoint[] | null,
  startDate: string,
  frequency: Frequency,
  amount: number,
  cleanDays: string[]
): DCACalculationResult {
  const [portfolio, setPortfolio] = useState<PortfolioPoint[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulation, setIsSimulation] = useState(false);
  const [simulationStartDate, setSimulationStartDate] = useState<string | undefined>();
  
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
  
  // Calculate portfolio when inputs change
  useEffect(() => {
    // Need history and worker, but allow empty startDate for simulation
    if (!history?.length || !workerAPIRef.current || amount <= 0) {
      setPortfolio([]);
      setSummary(null);
      return;
    }
    
    let cancelled = false;
    
    async function calculate() {
      setIsCalculating(true);
      setError(null);
      
      try {
        // Determine if we should use simulation mode
        const useSimulation = shouldUseSimulation(startDate, cleanDays);
        setIsSimulation(useSimulation);
        
        if (useSimulation) {
          // NEW USER: Show "what if" simulation for 1 year
          const simStart = getSimulatedStartDate();
          setSimulationStartDate(simStart);
          
          // Use potential calculation (assumes clean every scheduled day)
          const result = await workerAPIRef.current!.calculatePotentialPortfolio(
            history!,
            simStart,
            frequency,
            amount
          );
          
          if (!cancelled) {
            setPortfolio(result.portfolio);
            setSummary(result.summary);
          }
        } else {
          // EXISTING USER: Show actual DCA based on clean days
          setSimulationStartDate(undefined);
          
          const result = await workerAPIRef.current!.calculateGhostPortfolio(
            history!,
            startDate,
            frequency,
            amount,
            cleanDays
          );
          
          if (!cancelled) {
            setPortfolio(result.portfolio);
            setSummary(result.summary);
          }
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
  }, [history, startDate, frequency, amount, cleanDaysKey]); // cleanDaysKey is a memoized version of cleanDays
  
  return { portfolio, summary, isCalculating, error, isSimulation, simulationStartDate };
}

/**
 * Hook to calculate potential portfolio (if user stayed clean every day)
 */
export function usePotentialCalculation(
  history: PricePoint[] | null,
  startDate: string,
  frequency: Frequency,
  amount: number
): DCACalculationResult {
  const [portfolio, setPortfolio] = useState<PortfolioPoint[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const workerAPIRef = useRef<Remote<DCAWorkerAPI> | null>(null);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      workerRef.current = new Worker(
        new URL("../workers/dca-engine.worker.ts", import.meta.url)
      );
      workerAPIRef.current = wrap<DCAWorkerAPI>(workerRef.current);
    } catch (err) {
      console.error("Failed to initialize potential worker:", err);
    }
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  useEffect(() => {
    if (!history?.length || !workerAPIRef.current || !startDate || amount <= 0) {
      setPortfolio([]);
      setSummary(null);
      return;
    }
    
    let cancelled = false;
    
    async function calculate() {
      setIsCalculating(true);
      
      try {
        const result = await workerAPIRef.current!.calculatePotentialPortfolio(
          history!,
          startDate,
          frequency,
          amount
        );
        
        if (!cancelled) {
          setPortfolio(result.portfolio);
          setSummary(result.summary);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to calculate potential portfolio");
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
  }, [history, startDate, frequency, amount]);
  
  return { portfolio, summary, isCalculating, error };
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

