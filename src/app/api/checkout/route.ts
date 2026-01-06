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
 * POST /api/checkout
 * 
 * Creates a Stripe Checkout session for subscription purchase.
 * Returns the checkout URL for redirect.
 */
export async function POST(request: Request) {
  try {
    const stripeClient = getStripe();
    const body = await request.json();
    const { priceId, plan } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get the origin for success/cancel URLs
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Create Stripe Checkout session
    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Success URL includes session ID for client to store
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${origin}?canceled=true`,
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax
      billing_address_collection: "required",
      // Metadata for webhook processing
      metadata: {
        plan,
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create checkout session: ${message}` },
      { status: 500 }
    );
  }
}
