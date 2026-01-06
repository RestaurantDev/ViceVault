"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Loader2, Table as TableIcon, Target, Zap } from "lucide-react";
import { cn, formatCurrency, formatChartDate } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import { useSelectedAsset, useCleanDays, useViceConfig } from "@/store/vice-store";
import { useDCACalculation, useMarketData, type PortfolioSummary } from "@/hooks/use-dca-calculation";
import { AssetSelector } from "./asset-selector";
import { AccessibleTable } from "./accessible-table";

interface GhostPortfolioChartProps {
  onSummaryChange?: (data: {
    actual: { value: number; invested: number; gainLoss: number; gainLossPercent: number } | null;
    projection: { value: number; invested: number; gainLoss: number; gainLossPercent: number } | null;
  }) => void;
}

export function GhostPortfolioChart({ onSummaryChange }: GhostPortfolioChartProps) {
  const selectedAsset = useSelectedAsset();
  const cleanDays = useCleanDays();
  const { viceAmount, frequency, startDate } = useViceConfig();
  
  // Fetch market data (with fallback support)
  const { data: marketData, isLoading: isLoadingMarket, error: marketError, isUsingFallback } = useMarketData(selectedAsset);
  
  // Calculate BOTH actual and projection portfolios
  const { 
    actual,
    projection,
    isCalculating, 
    error: calcError,
  } = useDCACalculation(
    marketData,
    startDate,
    frequency,
    viceAmount,
    cleanDays
  );
  
  // State for view toggles
  const [showTable, setShowTable] = useState(false);
  
  // Notify parent of summary changes for TruthReport
  useEffect(() => {
    if (onSummaryChange) {
      onSummaryChange({
        actual: actual.summary ? {
          value: actual.summary.currentValue,
          invested: actual.summary.totalCashSpent,
          gainLoss: actual.summary.gainLoss,
          gainLossPercent: actual.summary.gainLossPercent,
        } : null,
        projection: projection.summary ? {
          value: projection.summary.currentValue,
          invested: projection.summary.totalCashSpent,
          gainLoss: projection.summary.gainLoss,
          gainLossPercent: projection.summary.gainLossPercent,
        } : null,
      });
    }
  }, [actual.summary, projection.summary, onSummaryChange]);
  
  // Format projection data for chart (sample to reduce points)
  const projectionChartData = useMemo(() => {
    if (!projection.portfolio.length) return [];
    
    const step = Math.max(1, Math.floor(projection.portfolio.length / 100));
    return projection.portfolio
      .filter((_, i) => i % step === 0 || i === projection.portfolio.length - 1)
      .map((point) => ({
        date: formatChartDate(point.date),
        fullDate: point.date,
        projectionValue: point.portfolioValue,
        projectionCash: point.cashSpent,
      }));
  }, [projection.portfolio]);
  
  // Format actual data for chart
  const actualChartData = useMemo(() => {
    if (!actual.portfolio.length) return [];
    
    const step = Math.max(1, Math.floor(actual.portfolio.length / 100));
    return actual.portfolio
      .filter((_, i) => i % step === 0 || i === actual.portfolio.length - 1)
      .map((point) => ({
        date: formatChartDate(point.date),
        fullDate: point.date,
        actualValue: point.portfolioValue,
        actualCash: point.cashSpent,
      }));
  }, [actual.portfolio]);
  
  // Merge both datasets for combined chart
  const combinedChartData = useMemo(() => {
    // Create a map of projection data by date
    const projectionMap = new Map(projectionChartData.map(p => [p.date, p]));
    const actualMap = new Map(actualChartData.map(a => [a.date, a]));
    
    // Get all unique dates
    const allDates = new Set([...projectionMap.keys(), ...actualMap.keys()]);
    
    // Combine data
    return Array.from(allDates)
      .sort()
      .map(date => ({
        date,
        fullDate: projectionMap.get(date)?.fullDate || actualMap.get(date)?.fullDate || date,
        projectionValue: projectionMap.get(date)?.projectionValue,
        actualValue: actualMap.get(date)?.actualValue,
        projectionCash: projectionMap.get(date)?.projectionCash,
        actualCash: actualMap.get(date)?.actualCash,
      }));
  }, [projectionChartData, actualChartData]);
  
  // Current focused point for keyboard nav
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!combinedChartData.length) return;
    
    if (e.key === "ArrowRight") {
      setFocusedIndex((prev) => 
        prev === null ? 0 : Math.min(prev + 1, combinedChartData.length - 1)
      );
    } else if (e.key === "ArrowLeft") {
      setFocusedIndex((prev) => 
        prev === null ? combinedChartData.length - 1 : Math.max(prev - 1, 0)
      );
    } else if (e.key === "Home") {
      setFocusedIndex(0);
    } else if (e.key === "End") {
      setFocusedIndex(combinedChartData.length - 1);
    } else if (e.key === "Escape") {
      setFocusedIndex(null);
    }
  }, [combinedChartData]);
  
  const isLoading = isLoadingMarket || isCalculating;
  const error = marketError || calcError;
  const hasActualData = (actual.summary?.cleanDaysCount || 0) > 0;
  
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Ghost Portfolio</h2>
          <p className="text-sm text-structure/50">
            Your progress vs your potential
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Accessibility Toggle */}
          <button
            onClick={() => setShowTable(!showTable)}
            className="btn-ghost flex items-center gap-2"
            aria-pressed={showTable}
            aria-label={showTable ? "Show chart view" : "Show data table"}
          >
            <TableIcon className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline text-sm">
              {showTable ? "Chart" : "Table"}
            </span>
          </button>
          
          <AssetSelector />
        </div>
      </div>
      
      {/* Dual Summary Cards */}
      {(actual.summary || projection.summary) && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* YOUR PROGRESS Card */}
          <DualSummarySection
            title="Your Progress"
            subtitle={hasActualData ? `${actual.summary?.cleanDaysCount || 0} clean days logged` : "Start logging to track"}
            icon={<Zap className="w-5 h-5 text-alpha" strokeWidth={1.5} />}
            summary={actual.summary}
            isEmpty={!hasActualData}
            variant="actual"
          />
          
          {/* 1-YEAR POTENTIAL Card */}
          <DualSummarySection
            title="1-Year Potential"
            subtitle="If you stay consistent weekly"
            icon={<Target className="w-5 h-5 text-structure/60" strokeWidth={1.5} />}
            summary={projection.summary}
            variant="projection"
          />
        </div>
      )}
      
      {/* Chart or Table */}
      <div
        className="relative h-80"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="figure"
        aria-label={`Portfolio performance chart for ${selectedAsset}`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
            <Loader2 className="w-8 h-8 text-alpha animate-spin" strokeWidth={1.5} />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-risk">{error}</p>
          </div>
        )}
        
        {/* Fallback Data Indicator */}
        {isUsingFallback && !isLoading && !error && combinedChartData.length > 0 && (
          <div className="absolute top-2 right-2 text-xs text-structure/50 bg-canvas/90 px-2 py-1 rounded-md border border-structure/10">
            Demo data • Live data loading...
          </div>
        )}
        
        {!showTable && combinedChartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={combinedChartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.structure} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={COLORS.structure} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.alpha} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLORS.alpha} stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={`${COLORS.structure}10`}
                vertical={false}
              />
              
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: COLORS.structure, fontSize: 12, opacity: 0.5 }}
                dy={10}
              />
              
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: COLORS.structure, fontSize: 12, opacity: 0.5 }}
                dx={-10}
              />
              
              <Tooltip content={<DualTooltip />} />
              
              {/* Projection Line (Dashed - "What could be") */}
              <Area
                type="monotone"
                dataKey="projectionValue"
                stroke={COLORS.structure}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                fill="url(#projectionFill)"
                name="1-Year Potential"
                connectNulls
              />
              
              {/* Actual Portfolio Line (Solid - "What you have") */}
              {hasActualData && (
                <Area
                  type="monotone"
                  dataKey="actualValue"
                  stroke={COLORS.alpha}
                  strokeWidth={3}
                  fill="url(#actualFill)"
                  name="Your Portfolio"
                  connectNulls
                />
              )}
              
              {/* Focused Point Indicator */}
              {focusedIndex !== null && combinedChartData[focusedIndex] && (
                <ReferenceLine
                  x={combinedChartData[focusedIndex].date}
                  stroke={COLORS.alpha}
                  strokeDasharray="3 3"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
        
        {/* Empty State for New Users */}
        {!isLoading && !error && !hasActualData && combinedChartData.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-surface/95 backdrop-blur-sm rounded-lg p-4 text-center max-w-xs">
              <Zap className="w-8 h-8 text-alpha mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-structure font-medium">
                Start logging clean days to see your real portfolio grow!
              </p>
              <p className="text-xs text-structure/50 mt-1">
                The dashed line shows your 1-year potential
              </p>
            </div>
          </div>
        )}
        
        {/* Accessible Table */}
        <AccessibleTable 
          data={projection.portfolio} 
          showTable={showTable}
        />
        
        {/* Keyboard Navigation Hint */}
        {!showTable && combinedChartData.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-structure/40 pb-1">
            Use arrow keys to navigate chart data
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-structure/50" style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor, currentColor 6px, transparent 6px, transparent 10px)" }} />
          <span className="text-structure/60">1-Year Potential</span>
        </div>
        {hasActualData && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-alpha" />
            <span className="text-structure/60">Your Portfolio</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DualSummarySectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  summary: PortfolioSummary | null;
  isEmpty?: boolean;
  variant: "actual" | "projection";
}

function DualSummarySection({ title, subtitle, icon, summary, isEmpty, variant }: DualSummarySectionProps) {
  const isProjection = variant === "projection";
  
  if (isEmpty) {
    return (
      <div className={cn(
        "rounded-xl p-4 border-2 border-dashed",
        "border-structure/20 bg-canvas/30"
      )}>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <div>
            <h3 className="font-semibold text-structure">{title}</h3>
            <p className="text-xs text-structure/50">{subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Invested" value="$0" muted />
          <MiniStat label="Value" value="$0" muted />
          <MiniStat label="Gain/Loss" value="--" muted />
          <MiniStat label="Clean Days" value="0" muted />
        </div>
      </div>
    );
  }
  
  if (!summary) return null;
  
  const isPositive = summary.gainLoss >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl p-4 border",
        isProjection 
          ? "border-structure/10 bg-canvas/50" 
          : "border-alpha/30 bg-gradient-to-br from-alpha/10 to-alpha/5"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div>
          <h3 className={cn(
            "font-semibold",
            isProjection ? "text-structure/80" : "text-structure"
          )}>
            {title}
          </h3>
          <p className="text-xs text-structure/50">{subtitle}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <MiniStat 
          label={isProjection ? "Would Invest" : "Invested"} 
          value={formatCurrency(summary.totalCashSpent, 0)} 
        />
        <MiniStat 
          label={isProjection ? "Would Be Worth" : "Current Value"} 
          value={formatCurrency(summary.currentValue, 0)}
          highlight={!isProjection}
        />
        <MiniStat 
          label={isProjection ? "Potential Gain" : "Gain/Loss"} 
          value={`${isPositive ? "+" : ""}${formatCurrency(summary.gainLoss, 0)}`}
          subValue={`${isPositive ? "+" : ""}${summary.gainLossPercent.toFixed(1)}%`}
          trend={isPositive ? "up" : "down"}
        />
        <MiniStat 
          label={isProjection ? "Weekly Buys" : "Clean Days"} 
          value={isProjection ? summary.purchasesCount.toString() : summary.cleanDaysCount.toString()}
          subValue={isProjection ? "52 weeks" : `${summary.purchasesCount} purchases`}
        />
      </div>
    </motion.div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down";
  highlight?: boolean;
  muted?: boolean;
}

function MiniStat({ label, value, subValue, trend, highlight, muted }: MiniStatProps) {
  return (
    <div>
      <p className="text-xs text-structure/50 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className={cn(
          "text-lg font-bold tabular-nums",
          muted && "text-structure/30",
          !muted && trend === "up" && "text-alpha",
          !muted && trend === "down" && "text-risk",
          !muted && !trend && highlight && "text-alpha",
          !muted && !trend && !highlight && "text-structure"
        )}>
          {value}
        </span>
        {trend && !muted && (
          trend === "up" 
            ? <TrendingUp className="w-3 h-3 text-alpha" strokeWidth={1.5} />
            : <TrendingDown className="w-3 h-3 text-risk" strokeWidth={1.5} />
        )}
      </div>
      {subValue && (
        <p className={cn(
          "text-xs",
          muted ? "text-structure/20" : "text-structure/50"
        )}>
          {subValue}
        </p>
      )}
    </div>
  );
}

function DualTooltip({ active, payload }: { 
  active?: boolean; 
  payload?: Array<{ 
    dataKey: string;
    payload: { 
      fullDate: string; 
      projectionValue?: number; 
      actualValue?: number;
      projectionCash?: number;
      actualCash?: number;
    } 
  }> 
}) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const hasActual = data.actualValue !== undefined;
  const hasProjection = data.projectionValue !== undefined;
  
  return (
    <div className="bg-surface/95 backdrop-blur-sm rounded-lg shadow-elevated border border-structure/10 p-3 min-w-[200px]">
      <p className="text-xs text-structure/50 mb-2">{data.fullDate}</p>
      
      {hasActual && (
        <div className="mb-2 pb-2 border-b border-structure/10">
          <p className="text-xs font-medium text-alpha mb-1">Your Portfolio</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-structure/60">Value:</span>
            <span className="text-sm font-semibold text-alpha tabular-nums">
              {formatCurrency(data.actualValue!, 0)}
            </span>
          </div>
        </div>
      )}
      
      {hasProjection && (
        <div>
          <p className="text-xs font-medium text-structure/60 mb-1">1-Year Potential</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-structure/60">Value:</span>
            <span className="text-sm font-medium text-structure tabular-nums">
              {formatCurrency(data.projectionValue!, 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
