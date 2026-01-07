"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, TrendingUp, Bitcoin, Building2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_ASSETS, type AssetSymbol } from "@/lib/constants";
import { useViceStore, useSelectedAsset } from "@/store/vice-store";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Indices": Building2,
  "Crypto": Bitcoin,
  "High Growth": TrendingUp,
  "Safe": Shield,
};

interface AssetSelectorProps {
  className?: string;
}

export function AssetSelector({ className }: AssetSelectorProps) {
  const selectedAsset = useSelectedAsset();
  const setAsset = useViceStore((s) => s.setAsset);
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get the selected asset details
  const selected = SUPPORTED_ASSETS.find((a) => a.symbol === selectedAsset);
  
  // Filter assets based on search
  const filteredAssets = SUPPORTED_ASSETS.filter((asset) => {
    const query = searchQuery.toLowerCase();
    return (
      asset.symbol.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query) ||
      asset.category.toLowerCase().includes(query)
    );
  });
  
  // Group by category
  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {} as Record<string, typeof SUPPORTED_ASSETS[number][]>);
  
  // Handle selection
  const handleSelect = (symbol: AssetSymbol) => {
    setAsset(symbol);
    setIsOpen(false);
    setSearchQuery("");
  };
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
          "hover:border-alpha/50 focus:outline-none focus:ring-2 focus:ring-alpha/20",
          isOpen ? "border-alpha bg-alpha/5" : "border-structure/20 bg-surface"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-structure">{selected?.symbol}</span>
          <span className="text-sm text-structure/50">{selected?.name}</span>
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-structure/50 transition-transform",
            isOpen && "rotate-180"
          )} 
          strokeWidth={1.5}
        />
      </button>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-xl shadow-elevated border border-structure/10 overflow-hidden z-50 min-w-[280px]"
          >
            {/* Search */}
            <div className="p-3 border-b border-structure/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-structure/40" strokeWidth={1.5} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-canvas rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-alpha/20"
                />
              </div>
            </div>
            
            {/* Asset List */}
            <div className="max-h-72 overflow-y-auto py-2">
              {Object.entries(groupedAssets).map(([category, assets]) => {
                const CategoryIcon = CATEGORY_ICONS[category] || TrendingUp;
                
                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-structure/50 uppercase tracking-wider">
                      <CategoryIcon className="w-3 h-3" strokeWidth={1.5} />
                      {category}
                    </div>
                    
                    {/* Assets */}
                    {assets.map((asset) => (
                      <button
                        key={asset.symbol}
                        onClick={() => handleSelect(asset.symbol)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          "hover:bg-alpha/5",
                          selectedAsset === asset.symbol && "bg-alpha/10"
                        )}
                      >
                        <span className="font-medium text-structure min-w-[60px]">
                          {asset.symbol}
                        </span>
                        <span className="text-sm text-structure/60 truncate">
                          {asset.name}
                        </span>
                        {selectedAsset === asset.symbol && (
                          <motion.div
                            layoutId="selected-indicator"
                            className="ml-auto w-2 h-2 rounded-full bg-alpha"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
              
              {filteredAssets.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-structure/50">
                  No assets found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


