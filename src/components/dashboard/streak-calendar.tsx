"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Snowflake,
  Flame,
  Check,
} from "lucide-react";
import { cn, formatCurrency, getTodayISO } from "@/lib/utils";
import { useViceStore, useCleanDays, useStreakFreezes, useViceConfig, useCalendarNotes } from "@/store/vice-store";
import { useHaptics } from "@/hooks/use-haptics";
import { useStoreHydration } from "@/hooks/use-store-hydration";
import { GoalProgress } from "./goal-progress";
import { DayDetailModal } from "./day-detail-modal";

interface StreakCalendarProps {
  className?: string;
}

export function StreakCalendar({ className }: StreakCalendarProps) {
  const isHydrated = useStoreHydration();
  const cleanDays = useCleanDays();
  const calendarNotes = useCalendarNotes();
  const { remaining: freezesRemaining, isSubscribed } = useStreakFreezes();
  const { startDate, viceAmount } = useViceConfig();
  
  const logCleanDay = useViceStore((s) => s.logCleanDay);
  const applyStreakFreeze = useViceStore((s) => s.useStreakFreeze);
  
  const { success, tap } = useHaptics();
  
  // Current view month
  const [viewDate, setViewDate] = useState(() => new Date());
  
  // Selected day for modal
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  
  // Get device locale for date formatting
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  
  // Generate localized weekday names
  const weekdays = useMemo(() => {
    const days: string[] = [];
    const baseDate = new Date(2024, 0, 7); // A Sunday
    for (let i = 0; i < 7; i++) {
      const day = new Date(baseDate);
      day.setDate(baseDate.getDate() + i);
      days.push(day.toLocaleDateString(locale, { weekday: "short" }));
    }
    return days;
  }, [locale]);
  
  // Get calendar data for current view
  const calendarData = useMemo(() => {
    if (!isHydrated) return { days: [], stats: { cleanCount: 0, missedCount: 0, currentStreak: 0 } };
    
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Days to show from previous month
    const startPadding = firstDay.getDay();
    
    // Build calendar grid
    const days: CalendarDay[] = [];
    const today = getTodayISO();
    const startDateObj = startDate ? new Date(startDate) : null;
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date: date.toISOString().split("T")[0],
        dayNumber: date.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isClean: false,
        isFuture: false,
        isBeforeStart: true,
      });
    }
    
    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];
      const isBeforeStart = startDateObj ? date < startDateObj : true;
      const isFuture = dateStr > today;
      
      days.push({
        date: dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === today,
        isClean: cleanDays.includes(dateStr),
        isFuture,
        isBeforeStart,
      });
    }
    
    // Next month padding (fill to 42 cells for consistent grid)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date: date.toISOString().split("T")[0],
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        isClean: false,
        isFuture: true,
        isBeforeStart: false,
      });
    }
    
    // Calculate stats
    const trackableDays = days.filter(
      (d) => d.isCurrentMonth && !d.isFuture && !d.isBeforeStart
    );
    const cleanCount = trackableDays.filter((d) => d.isClean).length;
    const missedCount = trackableDays.filter((d) => !d.isClean).length;
    
    // Calculate current streak
    const currentStreak = calculateStreak(cleanDays, today);
    
    return {
      days,
      stats: { cleanCount, missedCount, currentStreak },
    };
  }, [viewDate, cleanDays, startDate, isHydrated]);
  
  const handleDayClick = (day: CalendarDay) => {
    if (day.isFuture || day.isBeforeStart || !day.isCurrentMonth) return;
    
    if (day.isClean) {
      // Open modal to view details/add note (instead of removing clean day)
      setSelectedDay(day);
      tap();
    } else {
      // Check if this is today
      if (day.isToday) {
        logCleanDay();
        success();
      } else {
        // Past day - can't log clean for past days without freeze
        // Use streak freeze if available
        if (freezesRemaining > 0) {
          const used = applyStreakFreeze();
          if (used) {
            // Manually add this past day
            useViceStore.setState((state) => ({
              cleanDays: [...state.cleanDays, day.date].sort(),
            }));
            success();
          }
        } else {
          // Open modal to add a note even for non-clean days
          setSelectedDay(day);
          tap();
        }
      }
    }
  };
  
  const navigateMonth = (direction: number) => {
    setViewDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    tap();
  };
  
  const goToToday = () => {
    setViewDate(new Date());
    tap();
  };
  
  const monthYear = viewDate.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  
  // Calculate savings for this month
  const monthlySavings = calendarData.stats.cleanCount * viceAmount;
  
  return (
    <div className={cn("card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Streak Calendar</h2>
          <p className="text-sm text-structure/50">
            Track your daily progress
          </p>
        </div>
        
        {/* Streak Counter */}
        <div className="flex items-center gap-2 bg-alpha/10 px-4 py-2 rounded-xl">
          <Flame className="w-5 h-5 text-alpha" strokeWidth={1.5} />
          <div>
            <span className="text-lg font-bold text-alpha tabular-nums">
              {calendarData.stats.currentStreak}
            </span>
            <span className="text-sm text-alpha/70 ml-1">day streak</span>
          </div>
        </div>
      </div>
      
      {/* Goal Progress */}
      <GoalProgress className="mb-6" />
      
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="btn-ghost p-2"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        <button
          onClick={goToToday}
          className="text-lg font-semibold text-structure hover:text-alpha transition-colors"
        >
          {monthYear}
        </button>
        
        <button
          onClick={() => navigateMonth(1)}
          className="btn-ghost p-2"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-structure/40 py-2"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.days.map((day, index) => (
          <CalendarCell
            key={`${day.date}-${index}`}
            day={day}
            onClick={() => handleDayClick(day)}
            savingsAmount={viceAmount}
            hasNote={!!calendarNotes[day.date]}
          />
        ))}
      </div>
      
      {/* Stats Footer */}
      <div className="mt-6 pt-6 border-t border-structure/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-alpha tabular-nums">
              {calendarData.stats.cleanCount}
            </div>
            <div className="text-xs text-structure/50">Clean Days</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-risk tabular-nums">
              {calendarData.stats.missedCount}
            </div>
            <div className="text-xs text-structure/50">Missed Days</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-structure tabular-nums">
              {formatCurrency(monthlySavings, 0)}
            </div>
            <div className="text-xs text-structure/50">Saved This Month</div>
          </div>
        </div>
        
        {/* Streak Freeze Info */}
        {isSubscribed && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-structure/50">
            <Snowflake className="w-4 h-4 text-alpha" strokeWidth={1.5} />
            <span>{freezesRemaining} streak freeze{freezesRemaining !== 1 ? "s" : ""} remaining</span>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-structure/50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-alpha/20 border border-alpha" />
          <span>Clean</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-risk/10 border border-risk/30" />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-structure/5 border border-structure/10" />
          <span>Future</span>
        </div>
      </div>
      
      {/* Day Detail Modal */}
      <DayDetailModal
        date={selectedDay?.date || null}
        isClean={selectedDay?.isClean || false}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isClean: boolean;
  isFuture: boolean;
  isBeforeStart: boolean;
}

interface CalendarCellProps {
  day: CalendarDay;
  onClick: () => void;
  savingsAmount: number;
  hasNote?: boolean;
}

function CalendarCell({ day, onClick, savingsAmount, hasNote }: CalendarCellProps) {
  const isClickable = day.isCurrentMonth && !day.isFuture && !day.isBeforeStart;
  
  return (
    <motion.button
      whileTap={isClickable ? { scale: 0.9 } : undefined}
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "relative rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all",
        "min-h-[3.5rem] p-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alpha focus-visible:ring-offset-1",
        // Non-current month
        !day.isCurrentMonth && "text-structure/20",
        // Current month styling
        day.isCurrentMonth && !day.isFuture && !day.isBeforeStart && "cursor-pointer hover:bg-structure/5",
        // Today
        day.isToday && "ring-2 ring-alpha ring-offset-1",
        // Clean day
        day.isClean && "bg-alpha/20 text-alpha border border-alpha",
        // Missed day (past, not clean, not before start)
        day.isCurrentMonth && !day.isClean && !day.isFuture && !day.isBeforeStart && !day.isToday &&
          "bg-risk/10 text-risk/70 border border-risk/20",
        // Future
        day.isFuture && "text-structure/30 cursor-not-allowed",
        // Before start
        day.isBeforeStart && "text-structure/20 cursor-not-allowed"
      )}
      aria-label={`${day.date}${day.isClean ? `, saved $${savingsAmount}` : ""}${day.isToday ? ", today" : ""}`}
    >
      {/* Day number */}
      <span className="leading-none">{day.dayNumber}</span>
      
      {/* Savings amount on clean days */}
      {day.isClean && savingsAmount > 0 && (
        <span className="text-[10px] font-semibold text-alpha/80 leading-none mt-0.5">
          ${savingsAmount}
        </span>
      )}
      
      {/* Clean indicator */}
      {day.isClean && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-alpha rounded-full flex items-center justify-center"
        >
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </motion.div>
      )}
      
      {/* Note indicator */}
      {hasNote && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-structure/40 rounded-full" />
      )}
    </motion.button>
  );
}

/**
 * Calculate current streak from clean days
 */
function calculateStreak(cleanDays: string[], today: string): number {
  if (!cleanDays.length) return 0;
  
  const sorted = [...cleanDays].sort().reverse();
  
  // Get yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  // Streak must include today or yesterday to be active
  if (sorted[0] !== today && sorted[0] !== yesterdayStr) {
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

