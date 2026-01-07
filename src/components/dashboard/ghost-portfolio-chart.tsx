"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { TrendingUp, TrendingDown, Loader2, Table as TableIcon, Target, Zap, Share2, Download, Check } from "lucide-react";
import { toPng } from "html-to-image";
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

type TimeRange = "1Y" | "6M" | "3M" | "1M";

const TIME_RANGES: { value: TimeRange; label: string; months: number }[] = [
  { value: "1Y", label: "1Y", months: 12 },
  { value: "6M", label: "6M", months: 6 },
  { value: "3M", label: "3M", months: 3 },
  { value: "1M", label: "1M", months: 1 },
];

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
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Ref for chart export
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Export chart as image
  const handleExport = useCallback(async () => {
    if (!chartContainerRef.current || isExporting) return;
    
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      const dataUrl = await toPng(chartContainerRef.current, {
        backgroundColor: "#FFFFFF",
        pixelRatio: 2, // Higher quality
        style: {
          borderRadius: "12px",
        },
      });
      
      // Create download link
      const link = document.createElement("a");
      link.download = `vice-vault-portfolio-${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      link.click();
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to export chart:", err);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);
  
  // Copy chart to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!chartContainerRef.current || isExporting) return;
    
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      const dataUrl = await toPng(chartContainerRef.current, {
        backgroundColor: "#FFFFFF",
        pixelRatio: 2,
      });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy chart:", err);
      // Fallback to download if clipboard fails
      handleExport();
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, handleExport]);
  
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
  
  // Filter data based on selected time range
  const filteredChartData = useMemo(() => {
    if (!combinedChartData.length) return [];
    
    const selectedRange = TIME_RANGES.find(r => r.value === timeRange);
    if (!selectedRange) return combinedChartData;
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - selectedRange.months);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    
    return combinedChartData.filter(point => point.fullDate >= cutoffStr);
  }, [combinedChartData, timeRange]);
  
  // Smart Y-axis domain and formatter based on data magnitude
  const { yDomain, yFormatter } = useMemo(() => {
    const values = filteredChartData.flatMap(d => 
      [d.projectionValue, d.actualValue].filter((v): v is number => v !== undefined && v > 0)
    );
    
    if (!values.length) {
      return { 
        yDomain: [0, 100] as [number, number], 
        yFormatter: (v: number) => `$${v.toFixed(0)}` 
      };
    }
    
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    
    // Smart formatter based on value magnitude
    const formatter = (value: number): string => {
      if (maxVal >= 100000) return `$${(value / 1000).toFixed(0)}k`;
      if (maxVal >= 10000) return `$${(value / 1000).toFixed(0)}k`;
      if (maxVal >= 1000) return `$${(value / 1000).toFixed(1)}k`;
      if (maxVal >= 100) return `$${value.toFixed(0)}`;
      return `$${value.toFixed(0)}`;
    };
    
    // Calculate padding to show growth trajectory (don't always start at 0)
    const range = maxVal - minVal;
    const padding = range > 0 ? range * 0.15 : maxVal * 0.15;
    
    // For DCA charts, showing some baseline context is valuable
    // Start from slightly below min or 0, whichever shows better trajectory
    const domainMin = minVal > padding * 2 ? minVal - padding : 0;
    const domainMax = maxVal + padding;
    
    return {
      yDomain: [domainMin, domainMax] as [number, number],
      yFormatter: formatter
    };
  }, [filteredChartData]);
  
  // Current focused point for keyboard nav
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!filteredChartData.length) return;
    
    if (e.key === "ArrowRight") {
      setFocusedIndex((prev) => 
        prev === null ? 0 : Math.min(prev + 1, filteredChartData.length - 1)
      );
    } else if (e.key === "ArrowLeft") {
      setFocusedIndex((prev) => 
        prev === null ? filteredChartData.length - 1 : Math.max(prev - 1, 0)
      );
    } else if (e.key === "Home") {
      setFocusedIndex(0);
    } else if (e.key === "End") {
      setFocusedIndex(filteredChartData.length - 1);
    } else if (e.key === "Escape") {
      setFocusedIndex(null);
    }
  }, [filteredChartData]);
  
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
        
        <div className="flex items-center gap-2">
          {/* Export Button */}
          {!showTable && filteredChartData.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyToClipboard}
                disabled={isExporting}
                className={cn(
                  "btn-ghost flex items-center gap-2 p-2",
                  exportSuccess && "text-alpha"
                )}
                aria-label="Copy chart to clipboard"
                title="Copy to clipboard"
              >
                {exportSuccess ? (
                  <Check className="w-4 h-4" strokeWidth={1.5} />
                ) : isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Share2 className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-ghost flex items-center gap-2 p-2"
                aria-label="Download chart as image"
                title="Download as PNG"
              >
                <Download className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
          
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
      
      {/* Time Range Selector */}
      {!showTable && filteredChartData.length > 0 && (
        <div className="flex items-center justify-end gap-1 mb-4">
          {TIME_RANGES.map((range) => (
            <motion.button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                timeRange === range.value
                  ? "bg-alpha/15 text-alpha"
                  : "text-structure/50 hover:text-structure hover:bg-structure/5"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {range.label}
            </motion.button>
          ))}
        </div>
      )}
      
      {/* Chart or Table */}
      <div
        ref={chartContainerRef}
        className="relative h-80 bg-surface rounded-lg"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="figure"
        aria-label={`Portfolio performance chart for ${selectedAsset}`}
      >
        {/* Skeleton Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
            >
              <ChartSkeleton />
            </motion.div>
          )}
        </AnimatePresence>
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-risk">{error}</p>
          </div>
        )}
        
        {/* Fallback Data Indicator */}
        {isUsingFallback && !isLoading && !error && filteredChartData.length > 0 && (
          <div className="absolute top-2 right-2 text-xs text-structure/50 bg-canvas/90 px-2 py-1 rounded-md border border-structure/10 z-20">
            Demo data • Live data loading...
          </div>
        )}
        
        {!showTable && filteredChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
              <defs>
                {/* Projection gradient - ethereal, ghost-like appearance */}
                <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.structure} stopOpacity={0.12} />
                  <stop offset="40%" stopColor={COLORS.structure} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={COLORS.structure} stopOpacity={0} />
                </linearGradient>
                
                {/* Actual portfolio gradient - vibrant, premium feel */}
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.alpha} stopOpacity={0.5} />
                  <stop offset="30%" stopColor={COLORS.alpha} stopOpacity={0.25} />
                  <stop offset="70%" stopColor={COLORS.alpha} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={COLORS.alpha} stopOpacity={0} />
                </linearGradient>
                
                {/* Glow filter for actual portfolio line */}
                <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                
                {/* Stroke gradient for actual line - adds depth */}
                <linearGradient id="actualStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.alpha} stopOpacity={0.7} />
                  <stop offset="50%" stopColor={COLORS.alpha} stopOpacity={1} />
                  <stop offset="100%" stopColor={COLORS.alpha} stopOpacity={0.9} />
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
                domain={yDomain}
                tickFormatter={yFormatter}
                tickLine={false}
                axisLine={false}
                tick={{ fill: COLORS.structure, fontSize: 12, opacity: 0.5 }}
                dx={-10}
                width={60}
              />
              
              <Tooltip content={<DualTooltip />} />
              
              {/* Projection Line (Dashed - "What could be") */}
              <Area
                type="monotone"
                dataKey="projectionValue"
                stroke={COLORS.structure}
                strokeWidth={2}
                strokeDasharray="8 6"
                strokeOpacity={0.4}
                fill="url(#projectionFill)"
                name="1-Year Potential"
                connectNulls
                animationDuration={1200}
                animationEasing="ease-out"
              />
              
              {/* Actual Portfolio Line (Solid - "What you have") */}
              {hasActualData && (
                <Area
                  type="monotone"
                  dataKey="actualValue"
                  stroke="url(#actualStroke)"
                  strokeWidth={3}
                  fill="url(#actualFill)"
                  name="Your Portfolio"
                  connectNulls
                  animationDuration={1500}
                  animationEasing="ease-out"
                  style={{ filter: "url(#glowFilter)" }}
                />
              )}
              
              {/* Focused Point Indicator */}
              {focusedIndex !== null && filteredChartData[focusedIndex] && (
                <ReferenceLine
                  x={filteredChartData[focusedIndex].date}
                  stroke={COLORS.alpha}
                  strokeDasharray="3 3"
                />
              )}
              
              {/* End-point marker for projection */}
              {filteredChartData.length > 0 && filteredChartData[filteredChartData.length - 1]?.projectionValue && (
                <ReferenceDot
                  x={filteredChartData[filteredChartData.length - 1].date}
                  y={filteredChartData[filteredChartData.length - 1].projectionValue}
                  r={5}
                  fill={COLORS.structure}
                  fillOpacity={0.3}
                  stroke={COLORS.structure}
                  strokeWidth={2}
                  strokeOpacity={0.6}
                />
              )}
              
              {/* End-point marker for actual portfolio (with glow) */}
              {hasActualData && filteredChartData.length > 0 && filteredChartData[filteredChartData.length - 1]?.actualValue && (
                <ReferenceDot
                  x={filteredChartData[filteredChartData.length - 1].date}
                  y={filteredChartData[filteredChartData.length - 1].actualValue}
                  r={7}
                  fill={COLORS.alpha}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ filter: "url(#glowFilter)" }}
                />
              )}
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
        
        {/* Empty State for New Users */}
        {!isLoading && !error && !hasActualData && filteredChartData.length > 0 && (
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
          numericValue={summary.totalCashSpent}
        />
        <MiniStat 
          label={isProjection ? "Would Be Worth" : "Current Value"} 
          value={formatCurrency(summary.currentValue, 0)}
          highlight={!isProjection}
          numericValue={summary.currentValue}
        />
        <MiniStat 
          label={isProjection ? "Potential Gain" : "Gain/Loss"} 
          value={`${isPositive ? "+" : "-"}${formatCurrency(Math.abs(summary.gainLoss), 0)}`}
          subValue={`${isPositive ? "+" : ""}${summary.gainLossPercent.toFixed(1)}%`}
          trend={isPositive ? "up" : "down"}
          numericValue={summary.gainLoss}
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
  numericValue?: number; // Optional numeric value for animation
}

function MiniStat({ label, value, subValue, trend, highlight, muted, numericValue }: MiniStatProps) {
  return (
    <div>
      <p className="text-xs text-structure/50 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1.5">
        {numericValue !== undefined && !muted ? (
          <AnimatedNumber
            value={numericValue}
            className={cn(
              "text-lg font-bold tabular-nums",
              trend === "up" && "text-alpha",
              trend === "down" && "text-risk",
              !trend && highlight && "text-alpha",
              !trend && !highlight && "text-structure"
            )}
            prefix={value.startsWith("+") ? "+" : value.startsWith("-") ? "-" : "$"}
            isCurrency={value.includes("$")}
          />
        ) : (
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
        )}
        {trend && !muted && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {trend === "up" 
              ? <TrendingUp className="w-3 h-3 text-alpha" strokeWidth={1.5} />
              : <TrendingDown className="w-3 h-3 text-risk" strokeWidth={1.5} />
            }
          </motion.span>
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

/**
 * Animated number component that smoothly transitions between values
 */
function AnimatedNumber({ 
  value, 
  className, 
  prefix = "", 
  isCurrency = false 
}: { 
  value: number; 
  className?: string; 
  prefix?: string;
  isCurrency?: boolean;
}) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.01,
  });
  
  const displayValue = useTransform(springValue, (latest) => {
    const absValue = Math.abs(latest);
    if (isCurrency) {
      return `$${absValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    return absValue.toLocaleString("en-US", { maximumFractionDigits: 0 });
  });
  
  useEffect(() => {
    motionValue.set(Math.abs(value));
  }, [value, motionValue]);
  
  return (
    <span className={className}>
      {prefix !== "$" && prefix}
      <motion.span>{displayValue}</motion.span>
    </span>
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
  
  const hasActual = data.actualValue !== undefined && data.actualValue > 0;
  const hasProjection = data.projectionValue !== undefined && data.projectionValue > 0;
  
  // Calculate gain/loss for each
  const actualGain = hasActual && data.actualCash 
    ? data.actualValue! - data.actualCash 
    : 0;
  const actualGainPercent = hasActual && data.actualCash && data.actualCash > 0
    ? (actualGain / data.actualCash) * 100 
    : 0;
  
  const projectionGain = hasProjection && data.projectionCash 
    ? data.projectionValue! - data.projectionCash 
    : 0;
  const projectionGainPercent = hasProjection && data.projectionCash && data.projectionCash > 0
    ? (projectionGain / data.projectionCash) * 100 
    : 0;
  
  // Delta between actual and projection
  const delta = hasActual && hasProjection 
    ? data.projectionValue! - data.actualValue! 
    : null;
  
  return (
    <div className="bg-surface/95 backdrop-blur-sm rounded-xl shadow-elevated border border-structure/10 p-4 min-w-[240px]">
      {/* Date Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-structure/10">
        <p className="text-sm font-medium text-structure">{data.fullDate}</p>
      </div>
      
      {/* Actual Portfolio Section */}
      {hasActual && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-alpha" />
            <p className="text-xs font-semibold text-alpha uppercase tracking-wide">Your Portfolio</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pl-4">
            <div>
              <p className="text-xs text-structure/50">Value</p>
              <p className="text-base font-bold text-alpha tabular-nums">
                {formatCurrency(data.actualValue!, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-structure/50">Gain/Loss</p>
              <p className={cn(
                "text-sm font-semibold tabular-nums",
                actualGain >= 0 ? "text-alpha" : "text-risk"
              )}>
                {actualGain >= 0 ? "+" : ""}{formatCurrency(actualGain, 0)}
                <span className="text-xs ml-1 opacity-70">
                  ({actualGainPercent >= 0 ? "+" : ""}{actualGainPercent.toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Projection Section */}
      {hasProjection && (
        <div className={cn(hasActual && "pt-3 border-t border-structure/10")}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-structure/40" />
            <p className="text-xs font-semibold text-structure/60 uppercase tracking-wide">Potential</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pl-4">
            <div>
              <p className="text-xs text-structure/50">Value</p>
              <p className="text-base font-bold text-structure tabular-nums">
                {formatCurrency(data.projectionValue!, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-structure/50">Gain/Loss</p>
              <p className={cn(
                "text-sm font-semibold tabular-nums",
                projectionGain >= 0 ? "text-alpha" : "text-risk"
              )}>
                {projectionGain >= 0 ? "+" : ""}{formatCurrency(projectionGain, 0)}
                <span className="text-xs ml-1 opacity-70">
                  ({projectionGainPercent >= 0 ? "+" : ""}{projectionGainPercent.toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Delta Comparison */}
      {delta !== null && delta > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed border-structure/15">
          <div className="flex items-center justify-between">
            <span className="text-xs text-structure/50">Gap to potential</span>
            <span className="text-sm font-semibold text-structure/70 tabular-nums">
              {formatCurrency(delta, 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state that mimics chart shape
 */
function ChartSkeleton() {
  return (
    <div className="w-full h-full bg-surface/90 flex flex-col items-center justify-center gap-4">
      {/* Shimmer overlay */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Y-axis skeleton */}
        <div className="absolute left-0 top-4 bottom-8 w-12 flex flex-col justify-between py-2">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="h-3 w-8 bg-structure/10 rounded animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        
        {/* Chart area skeleton */}
        <div className="absolute left-14 right-4 top-4 bottom-8">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="h-px bg-structure/5"
              />
            ))}
          </div>
          
          {/* Animated chart curve */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="skeletonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1">
                  <animate 
                    attributeName="offset" 
                    values="-0.5;1" 
                    dur="1.5s" 
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.3">
                  <animate 
                    attributeName="offset" 
                    values="0;1.5" 
                    dur="1.5s" 
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.1">
                  <animate 
                    attributeName="offset" 
                    values="0.5;2" 
                    dur="1.5s" 
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
            </defs>
            <path
              d="M 0 70 Q 15 65, 25 60 T 50 45 T 75 35 T 100 25"
              fill="none"
              stroke="url(#skeletonGradient)"
              strokeWidth="2"
              className="text-alpha"
            />
            <path
              d="M 0 70 Q 15 65, 25 60 T 50 45 T 75 35 T 100 25 L 100 100 L 0 100 Z"
              fill="url(#skeletonGradient)"
              className="text-alpha"
              opacity="0.2"
            />
          </svg>
        </div>
        
        {/* X-axis skeleton */}
        <div className="absolute left-14 right-4 bottom-0 h-6 flex justify-between items-center">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className="h-3 w-10 bg-structure/10 rounded animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        
        {/* Center loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-surface/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <Loader2 className="w-5 h-5 text-alpha animate-spin" strokeWidth={1.5} />
            <span className="text-sm text-structure/60">Loading chart...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
