"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Shield, TrendingUp, BarChart3 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { PRICING } from "@/lib/constants";

const FEATURES = [
  { icon: TrendingUp, text: "Institutional-grade DCA backtesting" },
  { icon: BarChart3, text: "5 years of real market data" },
  { icon: Shield, text: "100% local-first privacy" },
];

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  const [isLoading, setIsLoading] = useState<"monthly" | "annual" | null>(null);
  
  const handleCheckout = async (plan: "monthly" | "annual") => {
    const pricing = PRICING[plan];
    
    if (!pricing.priceId) {
      console.error("Stripe price ID not configured");
      // In dev mode without Stripe, redirect to dashboard
      window.location.href = "/dashboard";
      return;
    }
    
    setIsLoading(plan);
    
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: pricing.priceId, plan }),
      });
      
      const result = await response.json();
      
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setIsLoading(null);
    }
  };
  
  return (
    <section className={cn("py-20", className)}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-structure mb-4">
            Invest in Your Future Self
          </h2>
          <p className="text-lg text-structure/60 max-w-2xl mx-auto">
            Less than the cost of one week&apos;s vice. Unlimited upside.
          </p>
        </motion.div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Monthly Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <PricingCard
              icon={Zap}
              title="Monthly"
              price={PRICING.monthly.amount}
              period="/month"
              tagline={PRICING.monthly.tagline}
              features={FEATURES}
              onSelect={() => handleCheckout("monthly")}
              isLoading={isLoading === "monthly"}
              variant="secondary"
            />
          </motion.div>
          
          {/* Annual Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PricingCard
              icon={Crown}
              title="Annual"
              price={PRICING.annual.amount}
              period="/year"
              tagline={PRICING.annual.tagline}
              features={FEATURES}
              onSelect={() => handleCheckout("annual")}
              isLoading={isLoading === "annual"}
              variant="primary"
              badge="Best Value"
            />
          </motion.div>
        </div>
        
        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center gap-8 mt-12 text-sm text-structure/50"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" strokeWidth={1.5} />
            <span>Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" strokeWidth={1.5} />
            <span>Cancel Anytime</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

interface PricingCardProps {
  icon: React.ElementType;
  title: string;
  price: number;
  period: string;
  tagline: string;
  features: typeof FEATURES;
  onSelect: () => void;
  isLoading: boolean;
  variant: "primary" | "secondary";
  badge?: string;
}

function PricingCard({
  icon: Icon,
  title,
  price,
  period,
  tagline,
  features,
  onSelect,
  isLoading,
  variant,
  badge,
}: PricingCardProps) {
  const isPrimary = variant === "primary";
  
  return (
    <div
      className={cn(
        "relative card h-full flex flex-col",
        isPrimary && "border-2 border-alpha shadow-elevated"
      )}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-alpha text-structure text-xs font-semibold px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isPrimary ? "bg-alpha text-structure" : "bg-structure/5 text-structure"
        )}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-semibold text-structure">{title}</h3>
          <p className="text-sm text-structure/50">{tagline}</p>
        </div>
      </div>
      
      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-structure tabular-nums">
            {formatCurrency(price, 0)}
          </span>
          <span className="text-structure/50">{period}</span>
        </div>
      </div>
      
      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, index) => {
          const FeatureIcon = feature.icon;
          return (
            <li key={index} className="flex items-center gap-3">
              <FeatureIcon className="w-4 h-4 text-alpha flex-shrink-0" strokeWidth={1.5} />
              <span className="text-sm text-structure/70">{feature.text}</span>
            </li>
          );
        })}
      </ul>
      
      {/* CTA */}
      <button
        onClick={onSelect}
        disabled={isLoading}
        className={cn(
          "w-full py-3 px-6 rounded-lg font-semibold transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isPrimary
            ? "bg-alpha text-structure hover:bg-alpha/90"
            : "bg-structure text-surface hover:bg-structure/90"
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
            Processing...
          </span>
        ) : (
          "Get Started"
        )}
      </button>
    </div>
  );
}
