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
}

/**
 * Hook to calculate DCA portfolio using Web Worker
 * 
 * Offloads heavy computation to a Web Worker to prevent UI freezing.
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
    if (!history?.length || !workerAPIRef.current || !startDate || amount <= 0) {
      setPortfolio([]);
      setSummary(null);
      return;
    }
    
    let cancelled = false;
    
    async function calculate() {
      setIsCalculating(true);
      setError(null);
      
      try {
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
  
  return { portfolio, summary, isCalculating, error };
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

