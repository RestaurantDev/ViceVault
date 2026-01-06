import { NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy initialization of Stripe client
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripe = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripe;
}

/**
 * POST /api/verify-sub
 * 
 * Verifies if a Stripe subscription ID is still active.
 * Called periodically by the client to validate access.
 */
export async function POST(request: Request) {
  try {
    const stripeClient = getStripe();
    const body = await request.json();
    const { subscriptionId, sessionId } = body;

    // If we have a session ID (just completed checkout), retrieve subscription from it
    if (sessionId) {
      const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      if (!session.subscription) {
        return NextResponse.json(
          { active: false, reason: "No subscription found in session" },
          { status: 200 }
        );
      }

      const subscription = session.subscription as Stripe.Subscription;
      const subData = subscription as unknown as { 
        current_period_end: number;
        id: string;
        status: string;
      };
      
      return NextResponse.json({
        active: subscription.status === "active" || subscription.status === "trialing",
        subscriptionId: subData.id,
        status: subscription.status,
        currentPeriodEnd: subData.current_period_end,
      });
    }

    // Otherwise verify the subscription ID directly
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID or Session ID is required" },
        { status: 400 }
      );
    }

    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    const subData = subscription as unknown as { 
      current_period_end: number; 
      cancel_at_period_end: boolean;
      status: string;
    };

    return NextResponse.json({
      active: subscription.status === "active" || subscription.status === "trialing",
      status: subscription.status,
      currentPeriodEnd: subData.current_period_end,
      cancelAtPeriodEnd: subData.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Subscription verification error:", error);
    
    // If subscription not found, return inactive
    if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
      return NextResponse.json({
        active: false,
        reason: "Subscription not found",
      });
    }

    return NextResponse.json(
      { error: "Failed to verify subscription" },
      { status: 500 }
    );
  }
}
