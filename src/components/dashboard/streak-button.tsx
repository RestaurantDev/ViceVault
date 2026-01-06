"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Undo2, Calendar, Flame, TrendingUp } from "lucide-react";
import { cn, formatCurrency, getTodayISO } from "@/lib/utils";
import { useViceStore, useCleanDays, useViceConfig, useSelectedAsset } from "@/store/vice-store";
import { useHaptics } from "@/hooks/use-haptics";
import { useStoreHydration } from "@/hooks/use-store-hydration";

interface StreakButtonProps {
  latestPrice?: number;
}

export function StreakButton({ latestPrice = 500 }: StreakButtonProps) {
  const isHydrated = useStoreHydration();
  const cleanDays = useCleanDays();
  const { viceAmount, viceName } = useViceConfig();
  const selectedAsset = useSelectedAsset();
  const logCleanDay = useViceStore((s) => s.logCleanDay);
  const removeCleanDay = useViceStore((s) => s.removeCleanDay);
  
  const { success, tap } = useHaptics();
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ shares: 0, value: 0 });
  
  // Memoize today's ISO date to prevent recalculation during renders
  const today = useMemo(() => getTodayISO(), []);
  
  // Check if today is already logged - only after hydration
  const todayLogged = isHydrated ? cleanDays.includes(today) : false;
  
  // Calculate streak - only after hydration
  const currentStreak = isHydrated ? calculateStreak(cleanDays, today) : 0;
  
  // Handle logging clean day
  const handleLogClean = () => {
    if (todayLogged) return;
    
    logCleanDay();
    success();
    
    // Calculate shares bought
    const sharesBought = viceAmount / latestPrice;
    const dollarValue = viceAmount;
    
    setToastMessage({ shares: sharesBought, value: dollarValue });
    setShowToast(true);
    
    // Hide toast after 4 seconds
    setTimeout(() => setShowToast(false), 4000);
  };
  
  // Handle undo
  const handleUndo = () => {
    removeCleanDay(today);
    tap();
    setShowToast(false);
  };
  
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Daily Check-In</h2>
          <p className="text-sm text-structure/50">
            Log your progress and build your portfolio
          </p>
        </div>
        
        {/* Streak Counter */}
        <div className="flex items-center gap-2 bg-alpha/10 px-3 py-1.5 rounded-lg">
          <Flame className="w-4 h-4 text-alpha" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-alpha">
            {currentStreak} day streak
          </span>
        </div>
      </div>
      
      {/* Main Button */}
      <motion.button
        onClick={handleLogClean}
        disabled={todayLogged}
        whileTap={{ scale: todayLogged ? 1 : 0.98 }}
        className={cn(
          "w-full py-6 rounded-xl font-semibold text-lg transition-all",
          "flex items-center justify-center gap-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          todayLogged
            ? "bg-alpha/10 text-alpha cursor-default focus-visible:ring-alpha/50"
            : "bg-alpha text-structure hover:bg-alpha/90 focus-visible:ring-alpha"
        )}
      >
        {todayLogged ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check className="w-6 h-6" strokeWidth={2} />
            </motion.div>
            <span>You stayed clean today!</span>
          </>
        ) : (
          <>
            <Calendar className="w-6 h-6" strokeWidth={1.5} />
            <span>I Stayed Clean Today</span>
          </>
        )}
      </motion.button>
      
      {/* Undo Button (when logged) */}
      <AnimatePresence>
        {todayLogged && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <button
              onClick={handleUndo}
              className="w-full py-2 text-sm text-structure/50 hover:text-structure flex items-center justify-center gap-2 transition-colors"
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.5} />
              <span>Undo (made a mistake)</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Info */}
      <div className="mt-6 pt-6 border-t border-structure/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-structure/50">Vice being tracked:</span>
          <span className="font-medium text-structure">{viceName || "Not set"}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-structure/50">Amount per occurrence:</span>
          <span className="font-medium text-structure">{formatCurrency(viceAmount, 0)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-structure/50">Investing in:</span>
          <span className="font-medium text-alpha">{selectedAsset}</span>
        </div>
      </div>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-structure text-surface px-6 py-4 rounded-xl shadow-elevated flex items-center gap-4">
              <div className="w-10 h-10 bg-alpha/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-alpha" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold">
                  You just bought {toastMessage.shares.toFixed(4)} {selectedAsset} units!
                </p>
                <p className="text-sm text-surface/70">
                  Portfolio +{formatCurrency(toastMessage.value, 2)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Calculate current streak of consecutive days
 */
function calculateStreak(cleanDays: string[], today: string): number {
  if (!cleanDays.length) return 0;
  
  const sorted = [...cleanDays].sort().reverse();
  const yesterday = getYesterdayISO(today);
  
  // Check if the streak includes today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = new Date(sorted[0]);
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split("T")[0];
    
    if (sorted[i] === prevDateStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  return streak;
}

function getYesterdayISO(today: string): string {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

