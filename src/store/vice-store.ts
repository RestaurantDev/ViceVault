import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { ViceStore, ViceState, PricePoint, SubscriptionStatus, Vice } from "@/types";
import type { Frequency, AssetSymbol } from "@/lib/constants";
import { getTodayISO } from "@/lib/utils";

/**
 * Generate a unique ID for vices
 */
function generateId(): string {
  return `vice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get frequency multiplier for annual calculation
 */
function getFrequencyMultiplier(frequency: Frequency): number {
  const multipliers: Record<Frequency, number> = {
    daily: 365,
    weekly: 52,
    biweekly: 26,
    monthly: 12,
  };
  return multipliers[frequency] || 52;
}

/**
 * Initial state for the Vice Vault store
 */
const initialState: ViceState = {
  // Identity
  stripeSubscriptionId: null,
  subscriptionStatus: "none",
  
  // Legacy Vice Configuration (for backwards compat)
  viceName: "",
  viceAmount: 0,
  frequency: "weekly",
  startDate: "",
  
  // Multi-Vice Support
  vices: [],
  
  // Streak Tracking
  cleanDays: [],
  
  // Pro Features
  streakFreezes: 1, // 1 free freeze per month
  lastStreakFreezeReset: "",
  
  // Portfolio Settings
  selectedAsset: "SPY",
  
  // Budget
  netIncome: 0,
  fixedCosts: 0,
  
  // Savings Goals
  savingsGoals: [],
  
  // Calendar Notes
  calendarNotes: {},
  
  // Cache
  marketDataCache: {},
  lastFetchedAt: {},
};

/**
 * Vice Vault Zustand Store
 * 
 * Local-first architecture: All data persisted to localStorage.
 * Identity is the Stripe Subscription ID.
 */
export const useViceStore = create<ViceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Set vice configuration (legacy - updates first vice or creates one)
       */
      setVice: (name: string, amount: number, frequency: Frequency) => {
        const currentStartDate = get().startDate;
        const today = getTodayISO();
        const newStartDate = currentStartDate || today;
        
        // Also add/update in vices array for multi-vice support
        const existingVices = get().vices;
        if (existingVices.length === 0) {
          // Create first vice
          const newVice: Vice = {
            id: generateId(),
            name,
            amount,
            frequency,
            createdAt: today,
            isActive: true,
          };
          set({
            viceName: name,
            viceAmount: amount,
            frequency,
            startDate: newStartDate,
            vices: [newVice],
          });
        } else {
          // Update first vice
          const updatedVices = [...existingVices];
          updatedVices[0] = { ...updatedVices[0], name, amount, frequency };
          set({
            viceName: name,
            viceAmount: amount,
            frequency,
            startDate: newStartDate,
            vices: updatedVices,
          });
        }
      },

      /**
       * Set the start date for tracking
       */
      setStartDate: (date: string) => {
        set({ startDate: date });
      },

      /**
       * Add a new vice
       */
      addVice: (viceData) => {
        const today = getTodayISO();
        const newVice: Vice = {
          ...viceData,
          id: generateId(),
          createdAt: today,
        };
        
        const vices = [...get().vices, newVice];
        const currentStartDate = get().startDate;
        
        // Get primary (first active) vice for legacy fields
        const activeVices = vices.filter((v) => v.isActive);
        const primaryVice = activeVices[0];
        
        // Legacy viceAmount should be the PRIMARY vice's amount (for DCA per-occurrence calculation)
        // The totalViceAmount is calculated separately in useViceConfig
        set({
          vices,
          viceName: primaryVice?.name || newVice.name,
          viceAmount: primaryVice?.amount || newVice.amount,
          frequency: primaryVice?.frequency || newVice.frequency,
          startDate: currentStartDate || today,
        });
      },

      /**
       * Update an existing vice
       */
      updateVice: (id: string, updates) => {
        const vices = get().vices.map((v) =>
          v.id === id ? { ...v, ...updates } : v
        );
        set({ vices });
        
        // Update legacy fields if updating first vice
        if (vices[0]?.id === id) {
          set({
            viceName: vices[0].name,
            viceAmount: vices[0].amount,
            frequency: vices[0].frequency,
          });
        }
      },

      /**
       * Remove a vice
       */
      removeVice: (id: string) => {
        const vices = get().vices.filter((v) => v.id !== id);
        
        // Get primary (first active) vice for legacy fields
        const activeVices = vices.filter((v) => v.isActive);
        const primaryVice = activeVices[0];
        
        // Update state with new vices - use primary vice's amount for legacy field
        set({
          vices,
          viceName: primaryVice?.name || "",
          viceAmount: primaryVice?.amount || 0,
          frequency: primaryVice?.frequency || "weekly",
        });
      },

      /**
       * Toggle vice active state (pause/resume)
       */
      toggleVice: (id: string) => {
        const vices = get().vices.map((v) =>
          v.id === id ? { ...v, isActive: !v.isActive } : v
        );
        
        // Get primary (first active) vice for legacy fields
        const activeVices = vices.filter((v) => v.isActive);
        const primaryVice = activeVices[0];
        
        // Use primary vice's amount for legacy field
        set({
          vices,
          viceName: primaryVice?.name || "",
          viceAmount: primaryVice?.amount || 0,
          frequency: primaryVice?.frequency || "weekly",
        });
      },

      /**
       * Log a clean day (user resisted vice today)
       */
      logCleanDay: () => {
        const today = getTodayISO();
        const { cleanDays, startDate } = get();
        
        if (cleanDays.includes(today)) return;
        
        // Set startDate if not already set (first clean day)
        const newStartDate = startDate || today;
        
        set({
          cleanDays: [...cleanDays, today].sort(),
          startDate: newStartDate,
        });
      },

      /**
       * Remove a clean day (if logged by mistake)
       */
      removeCleanDay: (date: string) => {
        set({
          cleanDays: get().cleanDays.filter((d) => d !== date),
        });
      },

      /**
       * Use a streak freeze (Pro feature)
       */
      useStreakFreeze: () => {
        const { streakFreezes, subscriptionStatus, lastStreakFreezeReset } = get();
        const today = getTodayISO();
        
        // Reset freezes monthly
        const thisMonth = today.substring(0, 7);
        const lastResetMonth = lastStreakFreezeReset.substring(0, 7);
        
        if (thisMonth !== lastResetMonth) {
          // New month - reset freezes
          const newFreezes = subscriptionStatus === "active" ? 3 : 1;
          set({
            streakFreezes: newFreezes - 1,
            lastStreakFreezeReset: today,
          });
          return true;
        }
        
        if (streakFreezes > 0) {
          set({ streakFreezes: streakFreezes - 1 });
          return true;
        }
        
        return false;
      },

      /**
       * Set the selected asset for portfolio simulation
       */
      setAsset: (ticker: AssetSymbol) => {
        set({ selectedAsset: ticker });
      },

      /**
       * Set subscription info after Stripe checkout
       */
      setSubscription: (id: string, status: SubscriptionStatus) => {
        set({
          stripeSubscriptionId: id,
          subscriptionStatus: status,
        });
      },

      /**
       * Clear subscription (e.g., on cancellation)
       */
      clearSubscription: () => {
        set({
          stripeSubscriptionId: null,
          subscriptionStatus: "none",
        });
      },

      /**
       * Set financial profile for cash flow analysis
       */
      setFinancials: (netIncome: number, fixedCosts: number) => {
        set({ netIncome, fixedCosts });
      },

      /**
       * Cache market data to avoid refetching
       */
      cacheMarketData: (symbol: string, data: PricePoint[]) => {
        set({
          marketDataCache: {
            ...get().marketDataCache,
            [symbol]: data,
          },
          lastFetchedAt: {
            ...get().lastFetchedAt,
            [symbol]: Date.now(),
          },
        });
      },

      /**
       * Add a new savings goal
       */
      addSavingsGoal: (goalData) => {
        const newGoal = {
          ...goalData,
          id: generateId(),
          createdAt: getTodayISO(),
        };
        set({ savingsGoals: [...get().savingsGoals, newGoal] });
      },

      /**
       * Update an existing savings goal
       */
      updateSavingsGoal: (id: string, updates) => {
        const goals = get().savingsGoals.map((g) =>
          g.id === id ? { ...g, ...updates } : g
        );
        set({ savingsGoals: goals });
      },

      /**
       * Remove a savings goal
       */
      removeSavingsGoal: (id: string) => {
        const goals = get().savingsGoals.filter((g) => g.id !== id);
        set({ savingsGoals: goals });
      },

      /**
       * Set a note for a calendar day
       */
      setCalendarNote: (date: string, note: string) => {
        const notes = { ...get().calendarNotes };
        if (note.trim()) {
          notes[date] = note.trim();
        } else {
          delete notes[date];
        }
        set({ calendarNotes: notes });
      },

      /**
       * Remove a note from a calendar day
       */
      removeCalendarNote: (date: string) => {
        const notes = { ...get().calendarNotes };
        delete notes[date];
        set({ calendarNotes: notes });
      },

      /**
       * Get total annual cost of all active vices
       */
      getTotalViceAmount: () => {
        const vices = get().vices.filter((v) => v.isActive);
        if (vices.length === 0) {
          // Fallback to legacy
          const { viceAmount, frequency } = get();
          return viceAmount * getFrequencyMultiplier(frequency);
        }
        
        return vices.reduce((total, vice) => {
          return total + vice.amount * getFrequencyMultiplier(vice.frequency);
        }, 0);
      },

      /**
       * Get active vices
       */
      getActiveVices: () => {
        return get().vices.filter((v) => v.isActive);
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "vice-vault-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        stripeSubscriptionId: state.stripeSubscriptionId,
        subscriptionStatus: state.subscriptionStatus,
        viceName: state.viceName,
        viceAmount: state.viceAmount,
        frequency: state.frequency,
        startDate: state.startDate,
        vices: state.vices,
        cleanDays: state.cleanDays,
        streakFreezes: state.streakFreezes,
        lastStreakFreezeReset: state.lastStreakFreezeReset,
        selectedAsset: state.selectedAsset,
        netIncome: state.netIncome,
        fixedCosts: state.fixedCosts,
        savingsGoals: state.savingsGoals,
        calendarNotes: state.calendarNotes,
        marketDataCache: state.marketDataCache,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);

/**
 * Selector hooks for optimized re-renders
 */
export const useViceConfig = () => {
  // Get primitive values directly to avoid re-render loops
  const vices = useViceStore((state) => state.vices);
  const legacyViceName = useViceStore((state) => state.viceName);
  const legacyViceAmount = useViceStore((state) => state.viceAmount);
  const legacyFrequency = useViceStore((state) => state.frequency);
  const storedStartDate = useViceStore((state) => state.startDate);
  
  // Compute derived values (these are computed each render but primitives don't change often)
  const activeVices = vices.filter((v) => v.isActive);
  const totalAmount = activeVices.reduce((sum, v) => sum + v.amount, 0);
  const primaryVice = activeVices[0];
  
  // Find earliest vice creation date
  const earliestViceDate = activeVices.length > 0
    ? activeVices.reduce((earliest, v) => 
        v.createdAt < earliest ? v.createdAt : earliest, 
        activeVices[0].createdAt
      )
    : null;
  
  // viceAmount should be the PRIMARY vice's per-occurrence amount for DCA calculation
  // totalViceAmount is the sum of all amounts (for display in StreakButton)
  return {
    viceName: primaryVice?.name || legacyViceName || "My Vice",
    viceAmount: primaryVice?.amount || legacyViceAmount || 0,
    frequency: primaryVice?.frequency || legacyFrequency,
    startDate: storedStartDate || earliestViceDate || "",
    vices,
    activeVices,
    totalViceAmount: totalAmount,
  };
};

export const useVices = () =>
  useViceStore((state) => state.vices);

export const useActiveVices = () => {
  const vices = useViceStore((state) => state.vices);
  return vices.filter((v) => v.isActive);
};

export const useCleanDays = () =>
  useViceStore((state) => state.cleanDays);

export const useStreakFreezes = () =>
  useViceStore(
    useShallow((state) => ({
      remaining: state.streakFreezes,
      isSubscribed: state.subscriptionStatus === "active",
    }))
  );

export const useSubscriptionStatus = () =>
  useViceStore(
    useShallow((state) => ({
      id: state.stripeSubscriptionId,
      status: state.subscriptionStatus,
    }))
  );

export const useSelectedAsset = () =>
  useViceStore((state) => state.selectedAsset);

export const useFinancials = () =>
  useViceStore(
    useShallow((state) => ({
      netIncome: state.netIncome,
      fixedCosts: state.fixedCosts,
    }))
  );

export const useMarketCache = () =>
  useViceStore(
    useShallow((state) => ({
      cache: state.marketDataCache,
      lastFetched: state.lastFetchedAt,
    }))
  );

export const useSavingsGoals = () =>
  useViceStore((state) => state.savingsGoals);

export const useActiveSavingsGoals = () => {
  const goals = useViceStore((state) => state.savingsGoals);
  return goals.filter((g) => g.isActive);
};

export const useCalendarNotes = () =>
  useViceStore((state) => state.calendarNotes);

/**
 * Computed selector for total annual vice cost
 */
export const useTotalViceCost = () => {
  const vices = useViceStore((state) => state.vices);
  const legacyAmount = useViceStore((state) => state.viceAmount);
  const legacyFrequency = useViceStore((state) => state.frequency);
  
  if (vices.length === 0) {
    return legacyAmount * getFrequencyMultiplier(legacyFrequency);
  }
  
  return vices
    .filter((v) => v.isActive)
    .reduce((total, vice) => {
      return total + vice.amount * getFrequencyMultiplier(vice.frequency);
    }, 0);
};
