"use client";

import { useCallback } from "react";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error" | "warning";

const PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [25],
  heavy: [50],
  success: [10, 50, 20],    // Short-pause-medium
  error: [50, 25, 50, 25, 50], // Three strong pulses
  warning: [25, 50, 25],    // Medium-pause-medium
};

/**
 * Hook for haptic feedback (mobile devices)
 */
export function useHaptics() {
  /**
   * Trigger haptic feedback
   */
  const vibrate = useCallback((pattern: HapticPattern = "medium") => {
    if (typeof window === "undefined") return;
    
    // Check if vibration is supported
    if (!("vibrate" in navigator)) {
      return;
    }
    
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Silently fail on unsupported devices
      console.debug("Haptic feedback not available");
    }
  }, []);
  
  /**
   * Light tap feedback
   */
  const tap = useCallback(() => vibrate("light"), [vibrate]);
  
  /**
   * Success feedback (e.g., logging clean day)
   */
  const success = useCallback(() => vibrate("success"), [vibrate]);
  
  /**
   * Error feedback
   */
  const error = useCallback(() => vibrate("error"), [vibrate]);
  
  /**
   * Warning feedback
   */
  const warning = useCallback(() => vibrate("warning"), [vibrate]);
  
  /**
   * Check if haptics are supported
   */
  const isSupported = typeof window !== "undefined" && "vibrate" in navigator;
  
  return {
    vibrate,
    tap,
    success,
    error,
    warning,
    isSupported,
  };
}

