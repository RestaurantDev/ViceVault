"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Cigarette, Wine, Coffee, Dices, Quote } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const TESTIMONIALS = [
  {
    id: 1,
    name: "The Smoker",
    icon: Cigarette,
    quote: "I was burning through $15 a day on cigarettes. Vice Vault showed me I'd lost $27,000 in 5 years. Now I'm 8 months clean with $4,200 invested.",
    saved: 4200,
    cleanDays: 243,
    vice: "Cigarettes",
  },
  {
    id: 2,
    name: "The Gambler",
    icon: Dices,
    quote: "DraftKings had me spending $200 a week. Seeing the NVIDIA backtest—what I could have had—was the wake-up call I needed.",
    saved: 8400,
    cleanDays: 312,
    vice: "Sports Betting",
  },
  {
    id: 3,
    name: "The Coffee Addict",
    icon: Coffee,
    quote: "Two lattes a day doesn't seem like much until you see it compounding. $12,000 in potential wealth opened my eyes.",
    saved: 2100,
    cleanDays: 180,
    vice: "Starbucks",
  },
  {
    id: 4,
    name: "The Social Drinker",
    icon: Wine,
    quote: "Bar tabs of $150 every weekend. Vice Vault proved that money could have bought me financial freedom instead of hangovers.",
    saved: 6500,
    cleanDays: 156,
    vice: "Alcohol",
  },
];

export function Testimonials() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  
  return (
    <section ref={containerRef} className="py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-structure mb-4">
            Real People. Real Transformations.
          </h2>
          <p className="text-lg text-structure/60 max-w-2xl mx-auto">
            See how others turned their vices into wealth using Vice Vault.
          </p>
        </motion.div>
        
        {/* Horizontal Scroll */}
        <div className="relative">
          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-canvas to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-canvas to-transparent z-10 pointer-events-none" />
          
          {/* Scrollable Container */}
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {TESTIMONIALS.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                index={index}
                isInView={isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface TestimonialCardProps {
  testimonial: typeof TESTIMONIALS[number];
  index: number;
  isInView: boolean;
}

function TestimonialCard({ testimonial, index, isInView }: TestimonialCardProps) {
  const Icon = testimonial.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex-shrink-0 w-80 snap-center"
    >
      <div className="card h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-alpha/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-alpha" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-structure">{testimonial.name}</h3>
            <p className="text-sm text-structure/50">Quit {testimonial.vice}</p>
          </div>
        </div>
        
        {/* Quote */}
        <div className="flex-1 mb-4">
          <Quote className="w-6 h-6 text-structure/10 mb-2" strokeWidth={1.5} />
          <p className="text-structure/70 leading-relaxed">
            {testimonial.quote}
          </p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-structure/10">
          <div>
            <p className="text-xs text-structure/50 uppercase tracking-wider mb-1">
              Saved & Invested
            </p>
            <p className="text-lg font-bold text-alpha tabular-nums">
              {formatCurrency(testimonial.saved, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-structure/50 uppercase tracking-wider mb-1">
              Clean Days
            </p>
            <p className="text-lg font-bold text-structure tabular-nums">
              {testimonial.cleanDays}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

