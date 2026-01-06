"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cigarette, 
  Wine, 
  Coffee, 
  Utensils, 
  Dices, 
  ShoppingBag,
  Tv,
  Leaf,
  TrendingUp,
  Flame,
  ArrowRight
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { FREQUENCIES, VICE_PRESETS, type Frequency } from "@/lib/constants";
import { useViceStore } from "@/store/vice-store";

const ICON_MAP: Record<string, React.ElementType> = {
  Cigarette,
  Wine,
  Coffee,
  Utensils,
  Dices,
  ShoppingBag,
  Tv,
  Leaf,
};

interface HeroCalculatorProps {
  onGetStarted?: () => void;
}

export function HeroCalculator({ onGetStarted }: HeroCalculatorProps) {
  const setVice = useViceStore((s) => s.setVice);
  const setStartDate = useViceStore((s) => s.setStartDate);
  
  const [viceName, setViceName] = useState("");
  const [viceAmount, setViceAmount] = useState(50);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [showPresets, setShowPresets] = useState(false);
  
  // Calculate projections
  const projections = useMemo(() => {
    const freq = FREQUENCIES.find((f) => f.value === frequency);
    const multiplier = freq?.multiplier || 52;
    
    const annualBurn = viceAmount * multiplier;
    const fiveYearBurn = annualBurn * 5;
    
    // Rough estimate: 10% annual return compounded
    const potentialWealth = calculateCompoundGrowth(viceAmount, multiplier, 5, 0.10);
    
    return {
      annualBurn,
      fiveYearBurn,
      potentialWealth,
      weeklyOpportunityCost: potentialWealth / 260, // Approx weeks in 5 years
    };
  }, [viceAmount, frequency]);
  
  // Handle preset selection
  const selectPreset = (preset: typeof VICE_PRESETS[number]) => {
    setViceName(preset.name);
    setViceAmount(preset.defaultAmount);
    setFrequency(preset.defaultFrequency);
    setShowPresets(false);
  };
  
  // Handle CTA click
  const handleGetStarted = () => {
    // Save to store
    setVice(viceName || "My Vice", viceAmount, frequency);
    setStartDate(new Date().toISOString().split("T")[0]);
    
    onGetStarted?.();
  };
  
  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-structure mb-2">
            Calculate Your Hidden Wealth
          </h2>
          <p className="text-structure/60">
            See what your vice is really costing you
          </p>
        </div>
        
        {/* Vice Name Input */}
        <div className="mb-6">
          <label className="label">What&apos;s Your Vice?</label>
          <div className="relative">
            <input
              type="text"
              value={viceName}
              onChange={(e) => setViceName(e.target.value)}
              onFocus={() => setShowPresets(true)}
              placeholder="e.g., Cigarettes, Coffee, Gambling..."
              className="input pr-10"
            />
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-structure/40 hover:text-structure transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
            </button>
          </div>
          
          {/* Preset Grid */}
          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 grid grid-cols-4 gap-2"
              >
                {VICE_PRESETS.map((preset) => {
                  const Icon = ICON_MAP[preset.icon] || Flame;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => selectPreset(preset)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                        "hover:border-alpha hover:bg-alpha/5",
                        viceName === preset.name 
                          ? "border-alpha bg-alpha/10" 
                          : "border-structure/10"
                      )}
                    >
                      <Icon className="w-5 h-5 text-structure/60" strokeWidth={1.5} />
                      <span className="text-xs text-structure/80 truncate w-full text-center">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Amount & Frequency */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Amount Spent</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-structure/40">
                $
              </span>
              <input
                type="number"
                value={viceAmount}
                onChange={(e) => setViceAmount(Number(e.target.value))}
                min={1}
                className="input pl-8 tabular-nums"
              />
            </div>
          </div>
          
          <div>
            <label className="label">How Often?</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="input"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Results */}
        <div className="bg-canvas rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Cash Burned */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-risk" strokeWidth={1.5} />
                <span className="text-sm font-medium text-structure/60">
                  5-Year Cash Burn
                </span>
              </div>
              <motion.div
                key={projections.fiveYearBurn}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-risk tabular-nums"
              >
                {formatCurrency(projections.fiveYearBurn, 0)}
              </motion.div>
              <p className="text-xs text-structure/50 mt-1">
                Gone forever
              </p>
            </div>
            
            {/* Potential Wealth */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-alpha" strokeWidth={1.5} />
                <span className="text-sm font-medium text-structure/60">
                  Potential Wealth
                </span>
              </div>
              <motion.div
                key={projections.potentialWealth}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-alpha tabular-nums blur-sm hover:blur-none transition-all duration-300"
              >
                {formatCurrency(projections.potentialWealth, 0)}
              </motion.div>
              <p className="text-xs text-structure/50 mt-1">
                If invested in S&P 500
              </p>
            </div>
          </div>
        </div>
        
        {/* Ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-structure/60 mb-6"
        >
          Every week you wait costs your future self{" "}
          <span className="font-semibold text-risk">
            ~{formatCurrency(projections.weeklyOpportunityCost, 0)}
          </span>
        </motion.div>
        
        {/* CTA */}
        <button
          onClick={handleGetStarted}
          className="btn-primary w-full flex items-center justify-center gap-2 group"
        >
          <span>Start Building Wealth</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
        </button>
      </motion.div>
    </div>
  );
}

/**
 * Calculate compound growth with regular contributions
 */
function calculateCompoundGrowth(
  contribution: number,
  contributionsPerYear: number,
  years: number,
  annualRate: number
): number {
  const monthlyRate = annualRate / 12;
  const contributionsPerMonth = contributionsPerYear / 12;
  const monthlyContribution = contribution * contributionsPerMonth;
  const totalMonths = years * 12;
  
  let total = 0;
  for (let i = 0; i < totalMonths; i++) {
    total = (total + monthlyContribution) * (1 + monthlyRate);
  }
  
  return total;
}

