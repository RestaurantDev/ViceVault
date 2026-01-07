"use client";

import { useEffect, useState } from "react";

/**
 * Hook to check if the Zustand store has hydrated from localStorage.
 * This prevents hydration mismatches between server and client.
 * 
 * Usage:
 * const isHydrated = useStoreHydration();
 * if (!isHydrated) return <Loading />;
 */
export function useStoreHydration(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after first client-side render
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Wrapper that prevents rendering until the store is hydrated.
 * Use this for components that depend heavily on persisted Zustand state.
 */
export function useHydratedValue<T>(value: T, fallback: T): T {
  const isHydrated = useStoreHydration();
  return isHydrated ? value : fallback;
}


