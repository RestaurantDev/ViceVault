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
  ReferenceArea,
} from "recharts";
import { TrendingUp, TrendingDown, Loader2, Table as TableIcon, Clock } from "lucide-react";
import { cn, formatCurrency, formatChartDate } from "@/lib/utils";
import { COLORS } from "@/lib/constants";
import { useSelectedAsset, useCleanDays, useViceConfig } from "@/store/vice-store";
import { useDCACalculation, useMarketData } from "@/hooks/use-dca-calculation";
import { AssetSelector } from "./asset-selector";
import { AccessibleTable } from "./accessible-table";

interface GhostPortfolioChartProps {
  onSummaryChange?: (data: {
    value: number;
    invested: number;
    gainLoss: number;
    gainLossPercent: number;
  }) => void;
}

export function GhostPortfolioChart({ onSummaryChange }: GhostPortfolioChartProps) {
  const selectedAsset = useSelectedAsset();
  const cleanDays = useCleanDays();
  const { viceAmount, frequency, startDate } = useViceConfig();
  
  // Fetch market data (with fallback support)
  const { data: marketData, isLoading: isLoadingMarket, error: marketError, isUsingFallback } = useMarketData(selectedAsset);
  
  // Calculate tracking period
  const trackingInfo = useMemo(() => {
    if (!startDate) return { months: 0, label: "Not started" };
    
    const start = new Date(startDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    
    if (diffMonths < 1) {
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return { months: 0, days: diffDays, label: `${diffDays} days` };
    } else if (diffMonths < 12) {
      return { months: diffMonths, label: `${diffMonths} month${diffMonths > 1 ? "s" : ""}` };
    } else {
      const years = Math.floor(diffMonths / 12);
      const remainingMonths = diffMonths % 12;
      return { 
        months: diffMonths, 
        label: `${years} yr${years > 1 ? "s" : ""}${remainingMonths > 0 ? ` ${remainingMonths} mo` : ""}` 
      };
    }
  }, [startDate]);
  
  // Calculate portfolio (with simulation mode for new users)
  const { 
    portfolio, 
    summary, 
    isCalculating, 
    error: calcError,
    isSimulation,
    simulationStartDate 
  } = useDCACalculation(
    marketData,
    startDate,
    frequency,
    viceAmount,
    cleanDays
  );
  
  // State for accessibility table toggle
  const [showTable, setShowTable] = useState(false);
  
  // Notify parent of summary changes for TruthReport
  useEffect(() => {
    if (summary && onSummaryChange) {
      onSummaryChange({
        value: summary.currentValue,
        invested: summary.totalCashSpent,
        gainLoss: summary.gainLoss,
        gainLossPercent: summary.gainLossPercent,
      });
    }
  }, [summary, onSummaryChange]);
  
  // Format data for chart (sample to reduce points)
  const chartData = useMemo(() => {
    if (!portfolio.length) return [];
    
    // Sample to ~100 points for performance
    const step = Math.max(1, Math.floor(portfolio.length / 100));
    return portfolio
      .filter((_, i) => i % step === 0 || i === portfolio.length - 1)
      .map((point) => ({
        ...point,
        date: formatChartDate(point.date),
        fullDate: point.date,
      }));
  }, [portfolio]);
  
  // Current focused point for keyboard nav
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!chartData.length) return;
    
    if (e.key === "ArrowRight") {
      setFocusedIndex((prev) => 
        prev === null ? 0 : Math.min(prev + 1, chartData.length - 1)
      );
    } else if (e.key === "ArrowLeft") {
      setFocusedIndex((prev) => 
        prev === null ? chartData.length - 1 : Math.max(prev - 1, 0)
      );
    } else if (e.key === "Home") {
      setFocusedIndex(0);
    } else if (e.key === "End") {
      setFocusedIndex(chartData.length - 1);
    } else if (e.key === "Escape") {
      setFocusedIndex(null);
    }
  }, [chartData]);
  
  const isLoading = isLoadingMarket || isCalculating;
  const error = marketError || calcError;
  
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Ghost Portfolio</h2>
          <p className="text-sm text-structure/50">
            What your money could have become
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
      
      {/* Simulation Mode Banner */}
      {isSimulation && summary && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-alpha/10 to-alpha/5 border border-alpha/20 rounded-lg p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-alpha/20 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-alpha" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-structure">
                What if you had started 1 year ago?
              </h3>
              <p className="text-sm text-structure/60 mt-1">
                This simulation shows what your portfolio could have been worth if you had invested your{" "}
                <span className="font-medium text-alpha">${viceAmount}/week</span> into{" "}
                <span className="font-medium text-alpha">{selectedAsset}</span> since{" "}
                {simulationStartDate ? new Date(simulationStartDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "last year"}.
              </p>
              <p className="text-xs text-structure/40 mt-2">
                Log 5+ clean days to see your actual portfolio growth.
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Summary Stats */}
      {summary && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
        >
          <SummaryCard
            label={isSimulation ? "Simulated Period" : "Time Tracking"}
            value={isSimulation ? "1 year" : trackingInfo.label}
            subValue={
              isSimulation 
                ? "What-if scenario" 
                : (startDate ? `Since ${new Date(startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : undefined)
            }
            trend="neutral"
            icon={<Clock className="w-4 h-4 text-alpha" strokeWidth={1.5} />}
          />
          <SummaryCard
            label={isSimulation ? "Would Invest" : "Cash Invested"}
            value={formatCurrency(summary.totalCashSpent, 0)}
            trend="neutral"
          />
          <SummaryCard
            label={isSimulation ? "Would Be Worth" : "Current Value"}
            value={formatCurrency(summary.currentValue, 0)}
            trend={summary.gainLoss >= 0 ? "up" : "down"}
          />
          <SummaryCard
            label={isSimulation ? "Potential Gain" : "Total Gain/Loss"}
            value={`${summary.gainLoss >= 0 ? "+" : ""}${formatCurrency(summary.gainLoss, 0)}`}
            subValue={`${summary.gainLossPercent >= 0 ? "+" : ""}${summary.gainLossPercent.toFixed(1)}%`}
            trend={summary.gainLoss >= 0 ? "up" : "down"}
          />
          <SummaryCard
            label={isSimulation ? "Weekly Investments" : "Clean Days"}
            value={isSimulation ? summary.purchasesCount.toString() : summary.cleanDaysCount.toString()}
            subValue={isSimulation ? "52 weeks simulated" : `${summary.purchasesCount} purchases`}
            trend="neutral"
          />
        </motion.div>
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
        {isUsingFallback && !isLoading && !error && chartData.length > 0 && (
          <div className="absolute top-2 right-2 text-xs text-structure/50 bg-canvas/90 px-2 py-1 rounded-md border border-structure/10">
            Demo data • Live data loading...
          </div>
        )}
        
        {!showTable && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.alpha} stopOpacity={0.3} />
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
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Cash Spent Line (Dashed) */}
              <Area
                type="monotone"
                dataKey="cashSpent"
                stroke={COLORS.structure}
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.4}
                fill="none"
                name="Cash Invested"
              />
              
              {/* Portfolio Value Line (Solid) */}
              <Area
                type="monotone"
                dataKey="portfolioValue"
                stroke={COLORS.alpha}
                strokeWidth={3}
                fill="url(#portfolioFill)"
                name="Portfolio Value"
              />
              
              {/* Tracking Period Reference Line - Start Date */}
              {startDate && chartData.length > 0 && (
                <ReferenceLine
                  x={formatChartDate(startDate)}
                  stroke={COLORS.alpha}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{
                    value: "Started",
                    position: "top",
                    fill: COLORS.alpha,
                    fontSize: 11,
                  }}
                />
              )}
              
              {/* Focused Point Indicator */}
              {focusedIndex !== null && chartData[focusedIndex] && (
                <ReferenceLine
                  x={chartData[focusedIndex].date}
                  stroke={COLORS.alpha}
                  strokeDasharray="3 3"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
        
        {/* Accessible Table */}
        <AccessibleTable 
          data={portfolio} 
          showTable={showTable}
        />
        
        {/* Keyboard Navigation Hint */}
        {!showTable && chartData.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-structure/40 pb-1">
            Use arrow keys to navigate chart data
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-structure/40" style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor, currentColor 5px, transparent 5px, transparent 10px)" }} />
          <span className="text-structure/60">Cash Invested</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-alpha" />
          <span className="text-structure/60">Portfolio Value</span>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

function SummaryCard({ label, value, subValue, trend, icon }: SummaryCardProps) {
  return (
    <div className="bg-canvas/50 rounded-lg p-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs text-structure/50 uppercase tracking-wider">
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={cn(
          "text-2xl font-bold tabular-nums",
          trend === "up" && "text-alpha",
          trend === "down" && "text-risk",
          trend === "neutral" && "text-structure"
        )}>
          {value}
        </span>
        {trend !== "neutral" && !icon && (
          trend === "up" 
            ? <TrendingUp className="w-4 h-4 text-alpha" strokeWidth={1.5} />
            : <TrendingDown className="w-4 h-4 text-risk" strokeWidth={1.5} />
        )}
      </div>
      {subValue && (
        <p className={cn(
          "text-sm mt-0.5",
          trend === "up" && "text-alpha/70",
          trend === "down" && "text-risk/70",
          trend === "neutral" && "text-structure/50"
        )}>
          {subValue}
        </p>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullDate: string; cashSpent: number; portfolioValue: number } }> }) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const gain = data.portfolioValue - data.cashSpent;
  const gainPercent = data.cashSpent > 0 
    ? ((gain / data.cashSpent) * 100).toFixed(1)
    : "0.0";
  
  return (
    <div className="bg-surface/95 backdrop-blur-sm rounded-lg shadow-elevated border border-structure/10 p-3">
      <p className="text-xs text-structure/50 mb-2">{data.fullDate}</p>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-structure/60">Invested:</span>
          <span className="text-sm font-medium text-structure tabular-nums">
            {formatCurrency(data.cashSpent, 0)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-structure/60">Value:</span>
          <span className="text-sm font-medium text-alpha tabular-nums">
            {formatCurrency(data.portfolioValue, 0)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-structure/10">
          <span className="text-sm text-structure/60">Gain:</span>
          <span className={cn(
            "text-sm font-medium tabular-nums",
            gain >= 0 ? "text-alpha" : "text-risk"
          )}>
            {gain >= 0 ? "+" : ""}{formatCurrency(gain, 0)} ({gainPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}

