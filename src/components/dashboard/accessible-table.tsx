"use client";

import { useMemo } from "react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { PortfolioPoint } from "@/types";

interface AccessibleTableProps {
  data: PortfolioPoint[];
  showTable: boolean;
}

/**
 * Accessible Table Fallback for Screen Readers
 * 
 * Always rendered for screen readers (sr-only when chart is shown).
 * Provides keyboard-navigable data for users who can't see the chart.
 */
export function AccessibleTable({ data, showTable }: AccessibleTableProps) {
  // Sample data to reduce table rows (show monthly summaries)
  const tableData = useMemo(() => {
    if (!data.length) return [];
    
    // Group by month and take the last value of each month
    const monthly = new Map<string, PortfolioPoint>();
    
    for (const point of data) {
      const monthKey = point.date.substring(0, 7); // YYYY-MM
      monthly.set(monthKey, point);
    }
    
    return Array.from(monthly.values());
  }, [data]);
  
  if (!data.length) {
    return (
      <div className={showTable ? "p-8 text-center text-structure/50" : "sr-only"}>
        No portfolio data available. Start logging clean days to see your progress.
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        "overflow-auto max-h-80",
        showTable ? "" : "sr-only"
      )}
      role="region"
      aria-label="Portfolio data table"
    >
      <table className="w-full text-sm" aria-describedby="table-description">
        <caption id="table-description" className="sr-only">
          Monthly portfolio performance showing date, cash invested, portfolio value, and percentage gain or loss.
        </caption>
        
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-structure/10">
            <th 
              scope="col" 
              className="text-left py-3 px-4 font-semibold text-structure"
            >
              Date
            </th>
            <th 
              scope="col" 
              className="text-right py-3 px-4 font-semibold text-structure"
            >
              Cash Invested
            </th>
            <th 
              scope="col" 
              className="text-right py-3 px-4 font-semibold text-structure"
            >
              Portfolio Value
            </th>
            <th 
              scope="col" 
              className="text-right py-3 px-4 font-semibold text-structure"
            >
              Gain/Loss
            </th>
          </tr>
        </thead>
        
        <tbody>
          {tableData.map((row, index) => {
            const gainLoss = row.portfolioValue - row.cashSpent;
            const gainLossPercent = row.cashSpent > 0 
              ? ((gainLoss / row.cashSpent) * 100) 
              : 0;
            const isPositive = gainLoss >= 0;
            
            return (
              <tr 
                key={row.date}
                className={cn(
                  "border-b border-structure/5 hover:bg-alpha/5 transition-colors",
                  index % 2 === 0 ? "bg-canvas/30" : ""
                )}
              >
                <td className="py-3 px-4 text-structure">
                  {formatDate(row.date)}
                </td>
                <td className="py-3 px-4 text-right text-structure tabular-nums">
                  {formatCurrency(row.cashSpent, 0)}
                </td>
                <td className={cn(
                  "py-3 px-4 text-right tabular-nums font-medium",
                  isPositive ? "text-alpha" : "text-risk"
                )}>
                  {formatCurrency(row.portfolioValue, 0)}
                </td>
                <td className={cn(
                  "py-3 px-4 text-right tabular-nums",
                  isPositive ? "text-alpha" : "text-risk"
                )}>
                  <span className="sr-only">
                    {isPositive ? "Gain of" : "Loss of"}
                  </span>
                  {isPositive ? "+" : ""}{formatCurrency(gainLoss, 0)}
                  <span className="text-structure/40 ml-1">
                    ({isPositive ? "+" : ""}{gainLossPercent.toFixed(1)}%)
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        
        {/* Summary Footer */}
        {tableData.length > 0 && (
          <tfoot className="bg-canvas/50 font-semibold">
            <tr>
              <td className="py-3 px-4 text-structure">
                Total ({tableData.length} months)
              </td>
              <td className="py-3 px-4 text-right text-structure tabular-nums">
                {formatCurrency(tableData[tableData.length - 1]?.cashSpent || 0, 0)}
              </td>
              <td className={cn(
                "py-3 px-4 text-right tabular-nums",
                (tableData[tableData.length - 1]?.portfolioValue || 0) >= 
                (tableData[tableData.length - 1]?.cashSpent || 0)
                  ? "text-alpha"
                  : "text-risk"
              )}>
                {formatCurrency(tableData[tableData.length - 1]?.portfolioValue || 0, 0)}
              </td>
              <td className={cn(
                "py-3 px-4 text-right tabular-nums",
                (() => {
                  const last = tableData[tableData.length - 1];
                  if (!last) return "";
                  return (last.portfolioValue - last.cashSpent) >= 0 
                    ? "text-alpha" 
                    : "text-risk";
                })()
              )}>
                {(() => {
                  const last = tableData[tableData.length - 1];
                  if (!last) return "-";
                  const gain = last.portfolioValue - last.cashSpent;
                  const pct = last.cashSpent > 0 
                    ? ((gain / last.cashSpent) * 100).toFixed(1) 
                    : "0.0";
                  return `${gain >= 0 ? "+" : ""}${formatCurrency(gain, 0)} (${pct}%)`;
                })()}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}


