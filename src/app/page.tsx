"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { 
  Vault, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3,
  ArrowDown,
  ChevronRight
} from "lucide-react";
import { HeroCalculator } from "@/components/landing/hero-calculator";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { Testimonials } from "@/components/landing/testimonials";
import { PricingSection } from "@/components/landing/pricing-section";

export default function LandingPage() {
  const pricingRef = useRef<HTMLDivElement>(null);
  
  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  return (
    <main className="min-h-screen bg-canvas">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-structure/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vault className="w-8 h-8 text-alpha" strokeWidth={1.5} />
            <span className="font-bold text-xl text-structure">Vice Vault</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={scrollToPricing}
              className="btn-ghost hidden sm:flex"
            >
              Pricing
            </button>
            <button 
              onClick={scrollToPricing}
              className="btn-primary"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-alpha/5 via-transparent to-transparent" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${`#13325010`} 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-structure leading-tight mb-6">
                Turn Bad Habits into{" "}
                <span className="text-alpha">Generational Wealth</span>
              </h1>
              
              <p className="text-lg md:text-xl text-structure/70 mb-8 max-w-xl">
                See exactly how your vice money would have grown if invested. 
                Institutional-grade DCA backtesting with 5 years of real market data.
              </p>
              
              {/* Value Props */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <ValueProp icon={TrendingUp} text="Real Market Data" />
                <ValueProp icon={Shield} text="100% Local-First" />
                <ValueProp icon={Zap} text="Instant Results" />
              </div>
              
              <button 
                onClick={scrollToPricing}
                className="btn-secondary inline-flex items-center gap-2 group"
              >
                <span>Start Building Wealth</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </button>
            </motion.div>
            
            {/* Right: Calculator */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <HeroCalculator onGetStarted={scrollToPricing} />
            </motion.div>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex justify-center mt-16"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-structure/30"
            >
              <ArrowDown className="w-6 h-6" strokeWidth={1.5} />
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Dashboard Preview Section */}
      <section className="py-20 bg-gradient-to-b from-canvas via-surface/50 to-canvas">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            title="Your Financial Command Center"
            subtitle="A terminal-grade interface for tracking your transformation."
          />
          
          <DashboardPreview />
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            title="The Truth Engine"
            subtitle="We don't predict. We prove."
          />
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <HowItWorksCard
              step={1}
              title="Track Your Vice"
              description="Log each day you resist temptation. Every clean day is an investment day."
              icon={BarChart3}
            />
            <HowItWorksCard
              step={2}
              title="Backtest Against History"
              description="See exactly what would have happened if you invested in SPY, Bitcoin, or NVIDIA."
              icon={TrendingUp}
            />
            <HowItWorksCard
              step={3}
              title="Build Real Wealth"
              description="Transform abstract savings into a concrete portfolio you can track daily."
              icon={Vault}
            />
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <Testimonials />
      
      {/* Pricing */}
      <div ref={pricingRef}>
        <PricingSection />
      </div>
      
      {/* Final CTA */}
      <section className="py-20 bg-structure text-surface">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              The Power is Truth
            </h2>
            <p className="text-lg text-surface/70 mb-8 max-w-2xl mx-auto">
              We&apos;re not telling you &ldquo;You might have $10k.&rdquo; We&apos;re telling you: 
              &ldquo;If you had bought NVIDIA instead of Cigarettes since 2020, you would have $84,000 today.&rdquo;
              <br /><br />
              That is not a prediction. That is a historical fact.
            </p>
            <button 
              onClick={scrollToPricing}
              className="bg-alpha text-structure font-semibold px-8 py-4 rounded-lg hover:bg-alpha/90 transition-colors"
            >
              Start Your Transformation
            </button>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-structure/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Vault className="w-5 h-5 text-alpha" strokeWidth={1.5} />
              <span className="text-sm text-structure/50">
                Vice Vault &copy; {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-structure/50">
              <a href="#" className="hover:text-structure transition-colors">Privacy</a>
              <a href="#" className="hover:text-structure transition-colors">Terms</a>
              <a href="#" className="hover:text-structure transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ValueProp({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-structure/70">
      <Icon className="w-4 h-4 text-alpha" strokeWidth={1.5} />
      <span>{text}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-structure mb-4">{title}</h2>
      <p className="text-lg text-structure/60 max-w-2xl mx-auto">{subtitle}</p>
    </motion.div>
  );
}

function HowItWorksCard({ 
  step, 
  title, 
  description, 
  icon: Icon 
}: { 
  step: number; 
  title: string; 
  description: string; 
  icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: step * 0.1 }}
      className="card text-center"
    >
      <div className="w-12 h-12 bg-alpha/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-alpha" strokeWidth={1.5} />
      </div>
      <div className="text-sm font-medium text-alpha mb-2">Step {step}</div>
      <h3 className="text-xl font-semibold text-structure mb-2">{title}</h3>
      <p className="text-structure/60">{description}</p>
    </motion.div>
  );
}
