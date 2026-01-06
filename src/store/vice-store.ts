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
        
        // Update legacy fields if this is the first vice
        if (vices.length === 1) {
          set({
            vices,
            viceName: newVice.name,
            viceAmount: newVice.amount,
            frequency: newVice.frequency,
            startDate: get().startDate || today,
          });
        } else {
          set({ vices });
        }
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
        set({ vices });
        
        // Update legacy fields
        if (vices.length > 0) {
          set({
            viceName: vices[0].name,
            viceAmount: vices[0].amount,
            frequency: vices[0].frequency,
          });
        } else {
          set({
            viceName: "",
            viceAmount: 0,
          });
        }
      },

      /**
       * Toggle vice active state (pause/resume)
       */
      toggleVice: (id: string) => {
        const vices = get().vices.map((v) =>
          v.id === id ? { ...v, isActive: !v.isActive } : v
        );
        set({ vices });
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
        marketDataCache: state.marketDataCache,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);

/**
 * Helper to compute vice aggregates
 */
function computeViceConfig(state: ViceState) {
  const activeVices = state.vices.filter((v) => v.isActive);
  const totalAmount = activeVices.reduce((sum, v) => sum + v.amount, 0);
  const primaryVice = activeVices[0];
  
  // Find earliest vice creation date for start date
  const earliestViceDate = activeVices.length > 0
    ? activeVices.reduce((earliest, v) => 
        v.createdAt < earliest ? v.createdAt : earliest, 
        activeVices[0].createdAt
      )
    : null;
  
  // Use stored startDate, or earliest vice date, or empty string
  const effectiveStartDate = state.startDate || earliestViceDate || "";
  
  return {
    viceName: primaryVice?.name || state.viceName || "My Vice",
    viceAmount: totalAmount > 0 ? totalAmount : state.viceAmount,
    frequency: primaryVice?.frequency || state.frequency,
    startDate: effectiveStartDate,
    totalViceAmount: totalAmount,
    activeVicesCount: activeVices.length,
  };
}

/**
 * Selector hooks for optimized re-renders
 */
export const useViceConfig = () => {
  const vices = useViceStore((state) => state.vices);
  const viceName = useViceStore((state) => state.viceName);
  const viceAmount = useViceStore((state) => state.viceAmount);
  const frequency = useViceStore((state) => state.frequency);
  const startDate = useViceStore((state) => state.startDate);
  
  // Compute derived values
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
  
  return {
    viceName: primaryVice?.name || viceName || "My Vice",
    viceAmount: totalAmount > 0 ? totalAmount : viceAmount,
    frequency: primaryVice?.frequency || frequency,
    startDate: startDate || earliestViceDate || "",
    vices,
    activeVices,
    totalViceAmount: totalAmount,
  };
};

export const useVices = () =>
  useViceStore((state) => state.vices);

export const useActiveVices = () =>
  useViceStore((state) => state.vices.filter((v) => v.isActive));

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
