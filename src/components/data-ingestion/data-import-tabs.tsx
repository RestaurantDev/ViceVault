"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clipboard, FileSpreadsheet, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { MagicPaste } from "./magic-paste";
import { CSVImport } from "./csv-import";

type Tab = "paste" | "csv";

import type { ParsedTransaction } from "@/lib/regex-parsers";

interface DataImportTabsProps {
  onTransactionsImported?: (transactions: ParsedTransaction[], source: string) => void;
}

export function DataImportTabs({ onTransactionsImported }: DataImportTabsProps) {
  // Default tab based on device (mobile = paste, desktop = csv)
  const [activeTab, setActiveTab] = useState<Tab>("paste");
  
  // Detect device on mount
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    setActiveTab(isMobile ? "paste" : "csv");
  }, []);
  
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "paste", label: "Magic Paste", icon: Clipboard },
    { id: "csv", label: "CSV Import", icon: FileSpreadsheet },
  ];
  
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Import Data</h2>
          <p className="text-sm text-structure/50">
            Analyze your spending to find your real vice costs
          </p>
        </div>
        
        {/* Security Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-alpha/5 px-3 py-1.5 rounded-lg">
          <Shield className="w-4 h-4 text-alpha" strokeWidth={1.5} />
          <span className="text-xs text-structure/70">Local Processing</span>
        </div>
      </div>
      
      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6 p-1 bg-canvas/50 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md transition-all",
                "text-sm font-medium relative",
                isActive
                  ? "text-structure"
                  : "text-structure/50 hover:text-structure/70"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-surface rounded-md shadow-card"
                  transition={{ type: "spring", duration: 0.3 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "paste" && (
          <MagicPaste 
            onTransactionsDetected={(txs, category) => 
              onTransactionsImported?.(txs, `magic-paste-${category}`)
            } 
          />
        )}
        {activeTab === "csv" && (
          <CSVImport 
            onTransactionsImported={(txs) => 
              onTransactionsImported?.(txs, "csv")
            } 
          />
        )}
      </div>
    </div>
  );
}

