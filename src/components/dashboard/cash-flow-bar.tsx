"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Wallet, AlertTriangle, Flame, Sparkles, Edit2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { COLORS, FREQUENCIES } from "@/lib/constants";
import { useViceStore, useFinancials, useViceConfig } from "@/store/vice-store";

export function CashFlowBar() {
  const { netIncome, fixedCosts } = useFinancials();
  const { viceAmount, frequency } = useViceConfig();
  const setFinancials = useViceStore((s) => s.setFinancials);
  
  const [isEditing, setIsEditing] = useState(!netIncome);
  const [incomeInput, setIncomeInput] = useState(netIncome.toString());
  const [costsInput, setCostsInput] = useState(fixedCosts.toString());
  
  // Calculate metrics
  const analysis = useMemo(() => {
    const freq = FREQUENCIES.find((f) => f.value === frequency);
    const monthlyViceCost = (viceAmount * (freq?.multiplier || 52)) / 12;
    const disposableIncome = netIncome - fixedCosts;
    const strangulationRatio = disposableIncome > 0 
      ? (monthlyViceCost / disposableIncome) * 100 
      : 0;
    
    // Calculate freedom runway (days the portfolio could sustain)
    // This would ideally use the actual portfolio value
    const dailyFixedCosts = fixedCosts / 30;
    
    return {
      monthlyViceCost,
      disposableIncome,
      strangulationRatio,
      afterVice: disposableIncome - monthlyViceCost,
      dailyFixedCosts,
    };
  }, [netIncome, fixedCosts, viceAmount, frequency]);
  
  // Chart data for stacked bar
  const chartData = useMemo(() => [
    {
      name: "Monthly Cash Flow",
      fixed: fixedCosts,
      vice: analysis.monthlyViceCost,
      disposable: Math.max(0, analysis.afterVice),
    },
  ], [fixedCosts, analysis]);
  
  // Handle save
  const handleSave = () => {
    setFinancials(
      parseFloat(incomeInput) || 0,
      parseFloat(costsInput) || 0
    );
    setIsEditing(false);
  };
  
  // Strangulation level
  const strangulationLevel = useMemo(() => {
    if (analysis.strangulationRatio >= 50) return "critical";
    if (analysis.strangulationRatio >= 25) return "warning";
    return "healthy";
  }, [analysis.strangulationRatio]);
  
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Cash Flow Engine</h2>
          <p className="text-sm text-structure/50">
            Visualize your financial strangulation
          </p>
        </div>
        
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-ghost flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm">{isEditing ? "Cancel" : "Edit"}</span>
        </button>
      </div>
      
      {/* Input Form */}
      {isEditing ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Monthly Net Income</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-structure/40">$</span>
                <input
                  type="number"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  placeholder="5000"
                  className="input pl-8 tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="label">Fixed Costs (Rent, Bills, etc.)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-structure/40">$</span>
                <input
                  type="number"
                  value={costsInput}
                  onChange={(e) => setCostsInput(e.target.value)}
                  placeholder="2500"
                  className="input pl-8 tabular-nums"
                />
              </div>
            </div>
          </div>
          
          <button onClick={handleSave} className="btn-primary w-full">
            Save Financial Profile
          </button>
        </motion.div>
      ) : netIncome > 0 ? (
        <>
          {/* Stacked Bar Chart */}
          <div className="h-24 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                
                <Tooltip content={<CashFlowTooltip />} cursor={false} />
                
                {/* Fixed Costs - Navy */}
                <Bar dataKey="fixed" stackId="a" fill={COLORS.structure} radius={[8, 0, 0, 8]}>
                  <LabelList
                    dataKey="fixed"
                    position="center"
                    fill="white"
                    fontSize={12}
                    fontWeight={600}
                    formatter={(value) => {
                      const num = typeof value === "number" ? value : 0;
                      return num > netIncome * 0.1 ? `Fixed: ${formatCurrency(num, 0)}` : "";
                    }}
                  />
                </Bar>
                
                {/* Vice Cost - Rose */}
                <Bar dataKey="vice" stackId="a" fill={COLORS.risk}>
                  <LabelList
                    dataKey="vice"
                    position="center"
                    fill="white"
                    fontSize={12}
                    fontWeight={600}
                    formatter={(value) => {
                      const num = typeof value === "number" ? value : 0;
                      return num > netIncome * 0.05 ? `Vice: ${formatCurrency(num, 0)}` : "";
                    }}
                  />
                </Bar>
                
                {/* Disposable - Alpha */}
                <Bar dataKey="disposable" stackId="a" fill={COLORS.alpha} radius={[0, 8, 8, 0]}>
                  <LabelList
                    dataKey="disposable"
                    position="center"
                    fill={COLORS.structure}
                    fontSize={12}
                    fontWeight={600}
                    formatter={(value) => {
                      const num = typeof value === "number" ? value : 0;
                      return num > netIncome * 0.1 ? `Free: ${formatCurrency(num, 0)}` : "";
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Strangulation Ratio */}
            <div className={cn(
              "rounded-lg p-4",
              strangulationLevel === "critical" && "bg-risk/10",
              strangulationLevel === "warning" && "bg-yellow-500/10",
              strangulationLevel === "healthy" && "bg-alpha/10"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {strangulationLevel === "critical" ? (
                  <AlertTriangle className="w-4 h-4 text-risk" strokeWidth={1.5} />
                ) : strangulationLevel === "warning" ? (
                  <Flame className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                ) : (
                  <Sparkles className="w-4 h-4 text-alpha" strokeWidth={1.5} />
                )}
                <span className="text-xs text-structure/50 uppercase tracking-wider">
                  Strangulation Ratio
                </span>
              </div>
              <div className={cn(
                "text-3xl font-bold tabular-nums",
                strangulationLevel === "critical" && "text-risk",
                strangulationLevel === "warning" && "text-yellow-600",
                strangulationLevel === "healthy" && "text-alpha"
              )}>
                {analysis.strangulationRatio.toFixed(1)}%
              </div>
              <p className="text-xs text-structure/50 mt-1">
                of disposable income going to vice
              </p>
            </div>
            
            {/* Monthly Vice Burn */}
            <div className="bg-risk/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-risk" strokeWidth={1.5} />
                <span className="text-xs text-structure/50 uppercase tracking-wider">
                  Monthly Vice Burn
                </span>
              </div>
              <div className="text-3xl font-bold text-risk tabular-nums">
                {formatCurrency(analysis.monthlyViceCost, 0)}
              </div>
              <p className="text-xs text-structure/50 mt-1">
                {formatCurrency(analysis.monthlyViceCost * 12, 0)}/year
              </p>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-structure" />
              <span className="text-structure/60">Fixed Costs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-risk" />
              <span className="text-structure/60">Vice Costs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-alpha" />
              <span className="text-structure/60">Disposable</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 text-structure/20 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-structure/50 mb-4">
            Add your income and fixed costs to see your cash flow analysis
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary"
          >
            Set Up Financial Profile
          </button>
        </div>
      )}
    </div>
  );
}

function CashFlowTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fixed: number; vice: number; disposable: number } }> }) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const total = data.fixed + data.vice + data.disposable;
  
  return (
    <div className="bg-surface/95 backdrop-blur-sm rounded-lg shadow-elevated border border-structure/10 p-3">
      <p className="text-xs text-structure/50 mb-2">Monthly Breakdown</p>
      
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-structure" />
            <span className="text-sm text-structure/60">Fixed:</span>
          </div>
          <span className="text-sm font-medium text-structure tabular-nums">
            {formatCurrency(data.fixed, 0)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-risk" />
            <span className="text-sm text-structure/60">Vice:</span>
          </div>
          <span className="text-sm font-medium text-risk tabular-nums">
            {formatCurrency(data.vice, 0)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-alpha" />
            <span className="text-sm text-structure/60">Free:</span>
          </div>
          <span className="text-sm font-medium text-alpha tabular-nums">
            {formatCurrency(data.disposable, 0)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-structure/10">
          <span className="text-sm text-structure/60">Total:</span>
          <span className="text-sm font-bold text-structure tabular-nums">
            {formatCurrency(total, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

