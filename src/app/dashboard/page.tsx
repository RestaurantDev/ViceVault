"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Vault, Settings, Menu, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useViceConfig } from "@/store/vice-store";
import { useCheckoutCallback, useSubscription } from "@/hooks/use-subscription";
import { useStoreHydration } from "@/hooks/use-store-hydration";
import { GhostPortfolioChart } from "@/components/dashboard/ghost-portfolio-chart";
import { CashFlowBar } from "@/components/dashboard/cash-flow-bar";
import { StreakButton } from "@/components/dashboard/streak-button";
import { StreakCalendar } from "@/components/dashboard/streak-calendar";
import { ViceManager } from "@/components/dashboard/vice-manager";
import { TruthReport } from "@/components/dashboard/truth-report";
import { DataImportTabs } from "@/components/data-ingestion/data-import-tabs";

export default function DashboardPage() {
  // Handle checkout callback (from Stripe redirect)
  useCheckoutCallback();
  
  // Wait for store hydration before rendering
  const isHydrated = useStoreHydration();
  const { isActive } = useSubscription();
  const { viceName, viceAmount } = useViceConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "vices" | "calendar" | "import">("overview");
  
  // Portfolio data state (passed to TruthReport)
  const [portfolioData, setPortfolioData] = useState({
    value: 0,
    invested: 0,
    gainLoss: 0,
    gainLossPercent: 0,
  });
  
  // Check if onboarding is complete - only after hydration
  const needsSetup = isHydrated ? (!viceName || viceAmount <= 0) : false;
  
  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-structure/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Click to go home */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Vault className="w-7 h-7 text-alpha" strokeWidth={1.5} />
              <span className="font-bold text-lg text-structure">Vice Vault</span>
            </Link>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <NavButton 
                active={activeSection === "overview"} 
                onClick={() => setActiveSection("overview")}
              >
                Dashboard
              </NavButton>
              <NavButton 
                active={activeSection === "vices"} 
                onClick={() => setActiveSection("vices")}
              >
                My Vices
              </NavButton>
              <NavButton 
                active={activeSection === "calendar"} 
                onClick={() => setActiveSection("calendar")}
              >
                Calendar
              </NavButton>
              <NavButton 
                active={activeSection === "import"} 
                onClick={() => setActiveSection("import")}
              >
                Import
              </NavButton>
            </nav>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2" aria-label="Settings">
                <Settings className="w-5 h-5" strokeWidth={1.5} />
              </button>
              
              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden btn-ghost p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Menu className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden py-4 border-t border-structure/10"
            >
              <nav className="flex flex-col gap-1">
                <NavButton 
                  active={activeSection === "overview"} 
                  onClick={() => {
                    setActiveSection("overview");
                    setMobileMenuOpen(false);
                  }}
                  fullWidth
                >
                  Dashboard
                </NavButton>
                <NavButton 
                  active={activeSection === "vices"} 
                  onClick={() => {
                    setActiveSection("vices");
                    setMobileMenuOpen(false);
                  }}
                  fullWidth
                >
                  My Vices
                </NavButton>
                <NavButton 
                  active={activeSection === "calendar"} 
                  onClick={() => {
                    setActiveSection("calendar");
                    setMobileMenuOpen(false);
                  }}
                  fullWidth
                >
                  Calendar
                </NavButton>
                <NavButton 
                  active={activeSection === "import"} 
                  onClick={() => {
                    setActiveSection("import");
                    setMobileMenuOpen(false);
                  }}
                  fullWidth
                >
                  Import
                </NavButton>
              </nav>
            </motion.div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Subscription Warning */}
        {!isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-alpha/10 rounded-xl flex items-center justify-between"
          >
            <p className="text-sm text-structure">
              You&apos;re viewing the dashboard in preview mode. Subscribe to unlock full features.
            </p>
            <a href="/" className="btn-primary text-sm py-2">
              Subscribe
            </a>
          </motion.div>
        )}
        
        {/* Setup Prompt */}
        {needsSetup && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 bg-surface rounded-xl border-2 border-dashed border-alpha/30 text-center"
          >
            <h2 className="text-xl font-semibold text-structure mb-2">
              Welcome to Vice Vault!
            </h2>
            <p className="text-structure/60 mb-4">
              Let&apos;s set up your vice to start tracking your transformation.
            </p>
            <a href="/" className="btn-primary inline-block">
              Set Up My Vice
            </a>
          </motion.div>
        )}
        
        {/* Dashboard Overview */}
        {activeSection === "overview" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Top Row: Streak Button */}
            <div className="mb-6">
              <StreakButton />
            </div>
            
            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Ghost Portfolio Chart */}
              <div className="lg:col-span-2">
                <GhostPortfolioChart onSummaryChange={setPortfolioData} />
              </div>
              
              {/* Truth Report */}
              <TruthReport
                portfolioValue={portfolioData.value}
                totalInvested={portfolioData.invested}
                gainLoss={portfolioData.gainLoss}
                gainLossPercent={portfolioData.gainLossPercent}
              />
              
              {/* Cash Flow */}
              <CashFlowBar />
            </div>
          </motion.div>
        )}
        
        {/* Vices Section */}
        {activeSection === "vices" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ViceManager />
          </motion.div>
        )}
        
        {/* Calendar Section */}
        {activeSection === "calendar" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <StreakCalendar />
          </motion.div>
        )}
        
        {/* Import Section */}
        {activeSection === "import" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <DataImportTabs />
          </motion.div>
        )}
      </main>
    </div>
  );
}

function NavButton({ 
  children, 
  active, 
  onClick, 
  fullWidth = false 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        fullWidth && "w-full text-left",
        active
          ? "bg-alpha/10 text-alpha"
          : "text-structure/60 hover:text-structure hover:bg-structure/5"
      )}
    >
      {children}
    </button>
  );
}


