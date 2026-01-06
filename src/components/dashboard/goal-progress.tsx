"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Sparkles, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useViceStore, useActiveSavingsGoals, useCleanDays, useViceConfig } from "@/store/vice-store";
import type { SavingsGoal } from "@/types";

interface GoalProgressProps {
  className?: string;
}

export function GoalProgress({ className }: GoalProgressProps) {
  const activeGoals = useActiveSavingsGoals();
  const cleanDays = useCleanDays();
  const { viceAmount } = useViceConfig();
  
  const [showSetGoal, setShowSetGoal] = useState(false);
  
  // Calculate current savings for the period
  const currentSavings = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const weeklyCleanDays = cleanDays.filter((d) => new Date(d) >= weekStart).length;
    const monthlyCleanDays = cleanDays.filter((d) => new Date(d) >= monthStart).length;
    
    return {
      weekly: weeklyCleanDays * viceAmount,
      monthly: monthlyCleanDays * viceAmount,
    };
  }, [cleanDays, viceAmount]);
  
  // Get the primary active goal (prefer weekly for display)
  const primaryGoal = activeGoals.find((g) => g.type === "weekly") || activeGoals[0];
  
  if (!primaryGoal && !showSetGoal) {
    return (
      <div className={cn("bg-canvas/50 rounded-lg p-4", className)}>
        <button
          onClick={() => setShowSetGoal(true)}
          className="w-full flex items-center justify-center gap-2 text-sm text-structure/60 hover:text-alpha transition-colors py-2"
        >
          <Target className="w-4 h-4" strokeWidth={1.5} />
          <span>Set a savings goal</span>
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    );
  }
  
  if (showSetGoal) {
    return (
      <SetGoalForm 
        onClose={() => setShowSetGoal(false)} 
        className={className}
      />
    );
  }
  
  const current = primaryGoal.type === "weekly" ? currentSavings.weekly : currentSavings.monthly;
  const target = primaryGoal.targetAmount;
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = progress >= 100;
  
  return (
    <div className={cn("bg-canvas/50 rounded-lg p-4", className)}>
      {/* Goal Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-alpha" strokeWidth={1.5} />
          <span className="text-sm font-medium text-structure">
            {primaryGoal.type === "weekly" ? "Weekly" : "Monthly"} Goal
          </span>
        </div>
        <button
          onClick={() => setShowSetGoal(true)}
          className="text-xs text-structure/50 hover:text-alpha transition-colors"
        >
          Edit
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="relative h-3 bg-structure/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isComplete 
              ? "bg-gradient-to-r from-alpha to-alpha/80" 
              : "bg-alpha/70"
          )}
        />
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        )}
      </div>
      
      {/* Progress Label */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-medium tabular-nums">
          <span className={isComplete ? "text-alpha" : "text-structure"}>
            {formatCurrency(current, 0)}
          </span>
          <span className="text-structure/40"> / {formatCurrency(target, 0)}</span>
        </span>
        
        <div className="flex items-center gap-1">
          {isComplete && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-alpha"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-xs font-medium">Complete!</span>
            </motion.div>
          )}
          {!isComplete && (
            <span className="text-xs text-structure/50">
              {progress.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface SetGoalFormProps {
  onClose: () => void;
  className?: string;
}

function SetGoalForm({ onClose, className }: SetGoalFormProps) {
  const addSavingsGoal = useViceStore((s) => s.addSavingsGoal);
  const activeGoals = useActiveSavingsGoals();
  const removeSavingsGoal = useViceStore((s) => s.removeSavingsGoal);
  
  const [type, setType] = useState<"weekly" | "monthly">("weekly");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SavingsGoal["category"]>("vice-savings");
  
  const existingGoal = activeGoals.find((g) => g.type === type);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = parseFloat(amount);
    if (isNaN(targetAmount) || targetAmount <= 0) return;
    
    // Remove existing goal of same type
    if (existingGoal) {
      removeSavingsGoal(existingGoal.id);
    }
    
    addSavingsGoal({
      type,
      targetAmount,
      category,
      isActive: true,
    });
    
    onClose();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("bg-surface rounded-lg p-4 border border-structure/10 shadow-sm", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-structure">Set Savings Goal</h3>
        <button onClick={onClose} className="text-structure/40 hover:text-structure">
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Goal Type */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("weekly")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              type === "weekly"
                ? "bg-alpha text-white"
                : "bg-structure/5 text-structure/60 hover:bg-structure/10"
            )}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setType("monthly")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              type === "monthly"
                ? "bg-alpha text-white"
                : "bg-structure/5 text-structure/60 hover:bg-structure/10"
            )}
          >
            Monthly
          </button>
        </div>
        
        {/* Target Amount */}
        <div>
          <label className="block text-xs text-structure/50 mb-1">
            Target Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-structure/40">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={type === "weekly" ? "50" : "200"}
              className="input pl-7 w-full"
              min="1"
              required
            />
          </div>
        </div>
        
        {/* Category */}
        <div>
          <label className="block text-xs text-structure/50 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SavingsGoal["category"])}
            className="input w-full"
          >
            <option value="vice-savings">Vice Savings</option>
            <option value="emergency">Emergency Fund</option>
            <option value="vacation">Vacation Fund</option>
            <option value="debt">Debt Payoff</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        
        {/* Submit */}
        <button type="submit" className="btn-primary w-full">
          Set Goal
        </button>
      </form>
    </motion.div>
  );
}

