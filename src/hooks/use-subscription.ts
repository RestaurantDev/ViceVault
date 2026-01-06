"use client";

import { useEffect, useCallback } from "react";
import { useViceStore, useSubscriptionStatus } from "@/store/vice-store";

/**
 * Hook to manage subscription state and verification
 */
export function useSubscription() {
  const { id, status } = useSubscriptionStatus();
  const setSubscription = useViceStore((s) => s.setSubscription);
  const clearSubscription = useViceStore((s) => s.clearSubscription);
  
  /**
   * Verify subscription is still active
   */
  const verifySubscription = useCallback(async () => {
    if (!id) return false;
    
    try {
      const response = await fetch("/api/verify-sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      
      const result = await response.json();
      
      if (result.active) {
        setSubscription(id, "active");
        return true;
      } else {
        // Subscription is no longer active
        clearSubscription();
        return false;
      }
    } catch (error) {
      console.error("Subscription verification failed:", error);
      return false;
    }
  }, [id, setSubscription, clearSubscription]);
  
  /**
   * Handle Stripe checkout success
   */
  const handleCheckoutSuccess = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch("/api/verify-sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      
      const result = await response.json();
      
      if (result.active && result.subscriptionId) {
        setSubscription(result.subscriptionId, "active");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Checkout verification failed:", error);
      return false;
    }
  }, [setSubscription]);
  
  /**
   * Start Stripe checkout
   */
  const startCheckout = useCallback(async (priceId: string, plan: string) => {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, plan }),
      });
      
      const result = await response.json();
      
      if (result.url) {
        window.location.href = result.url;
        return true;
      }
      
      throw new Error(result.error || "Failed to create checkout session");
    } catch (error) {
      console.error("Checkout failed:", error);
      return false;
    }
  }, []);
  
  // Verify subscription periodically (every 60 seconds)
  useEffect(() => {
    if (!id || status !== "active") return;
    
    // Initial verification
    verifySubscription();
    
    // Set up periodic verification
    const interval = setInterval(verifySubscription, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [id, status, verifySubscription]);
  
  return {
    subscriptionId: id,
    isActive: status === "active",
    isPending: status === "pending",
    verifySubscription,
    handleCheckoutSuccess,
    startCheckout,
    clearSubscription,
  };
}

/**
 * Hook to check for checkout success on page load
 */
export function useCheckoutCallback() {
  const { handleCheckoutSuccess } = useSubscription();
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    
    if (sessionId) {
      handleCheckoutSuccess(sessionId).then((success) => {
        if (success) {
          // Clean up URL
          const url = new URL(window.location.href);
          url.searchParams.delete("session_id");
          url.searchParams.delete("plan");
          window.history.replaceState({}, "", url.pathname);
        }
      });
    }
  }, [handleCheckoutSuccess]);
}

