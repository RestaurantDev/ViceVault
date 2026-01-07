"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clipboard, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ArrowRight,
  Wine,
  Coffee,
  Truck,
  CreditCard,
  ShoppingBag,
  Cigarette,
  Dices,
  UtensilsCrossed,
  Leaf,
  type LucideIcon
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { 
  parseStatementText, 
  detectViceCategory,
  calculateTransactionSummary,
  VICE_KEYWORDS,
  type ParsedTransaction 
} from "@/lib/regex-parsers";

interface MagicPasteProps {
  onTransactionsDetected?: (transactions: ParsedTransaction[], category: string) => void;
}

/**
 * Category theme system - each vice has its own color and icon
 */
const CATEGORY_THEMES: Record<string, { color: string; icon: LucideIcon; label: string }> = {
  alcohol:       { color: "#dc2626", icon: Wine,            label: "Alcohol" },
  coffee:        { color: "#92400e", icon: Coffee,          label: "Coffee" },
  delivery:      { color: "#ea580c", icon: Truck,           label: "Delivery" },
  subscriptions: { color: "#7c3aed", icon: CreditCard,      label: "Subscriptions" },
  shopping:      { color: "#0891b2", icon: ShoppingBag,     label: "Shopping" },
  smoking:       { color: "#64748b", icon: Cigarette,       label: "Smoking" },
  gambling:      { color: "#ca8a04", icon: Dices,           label: "Gambling" },
  fastFood:      { color: "#e11d48", icon: UtensilsCrossed, label: "Fast Food" },
  cannabis:      { color: "#16a34a", icon: Leaf,            label: "Cannabis" },
};

export function MagicPaste({ onTransactionsDetected }: MagicPasteProps) {
  const [rawText, setRawText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Ref for scrolling to first match
  const firstMatchRef = useRef<HTMLDivElement>(null);
  const transactionListRef = useRef<HTMLDivElement>(null);
  
  // Parse transactions
  const allTransactions = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseStatementText(rawText);
  }, [rawText]);
  
  // Detect vice categories
  const detectedCategories = useMemo(() => {
    return detectViceCategory(allTransactions);
  }, [allTransactions]);
  
  // Track which transaction indices match the selected category
  const matchingTransactionIds = useMemo(() => {
    if (!selectedCategory) return new Set<number>();
    
    const keywords = VICE_KEYWORDS[selectedCategory.toLowerCase()] || [];
    return new Set(
      allTransactions
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => {
          if (!t?.description) return false;
          const descLower = t.description.toLowerCase();
          return keywords.some(kw => descLower.includes(kw.toLowerCase()));
        })
        .map(({ i }) => i)
    );
  }, [allTransactions, selectedCategory]);
  
  // Get filtered transactions for summary calculation
  const filteredTransactions = useMemo(() => {
    if (!selectedCategory) return allTransactions;
    return allTransactions.filter((_, i) => matchingTransactionIds.has(i));
  }, [allTransactions, selectedCategory, matchingTransactionIds]);
  
  // Summary stats for filtered transactions
  const summary = useMemo(() => {
    return calculateTransactionSummary(filteredTransactions);
  }, [filteredTransactions]);
  
  // Total summary for all transactions
  const totalSummary = useMemo(() => {
    return calculateTransactionSummary(allTransactions);
  }, [allTransactions]);
  
  // Scroll to first match when category is selected
  useEffect(() => {
    if (selectedCategory && firstMatchRef.current && transactionListRef.current) {
      // Small delay to let animations start
      setTimeout(() => {
        firstMatchRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [selectedCategory]);
  
  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawText(text);
      setShowResults(true);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Failed to read clipboard:", error);
    }
  };
  
  // Handle apply
  const handleApply = () => {
    if (filteredTransactions.length && selectedCategory) {
      onTransactionsDetected?.(filteredTransactions, selectedCategory);
    }
  };
  
  // Clear
  const handleClear = () => {
    setRawText("");
    setSelectedCategory(null);
    setShowResults(false);
  };
  
  // Handle category selection
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(prev => prev === category ? null : category);
  };
  
  return (
    <div className="space-y-6">
      {/* Textarea */}
      <div className="relative">
        <textarea
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setShowResults(true);
            setSelectedCategory(null);
          }}
          placeholder="Paste your bank statement here... We'll automatically detect transactions."
          className="input min-h-[200px] resize-none font-mono text-sm"
        />
        
        {/* Paste Button */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {rawText && (
            <button
              onClick={handleClear}
              className="p-2 rounded-lg bg-structure/5 hover:bg-structure/10 transition-colors"
              aria-label="Clear text"
            >
              <X className="w-4 h-4 text-structure/60" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={handlePaste}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-alpha text-structure font-medium text-sm hover:bg-alpha/90 transition-colors"
          >
            <Clipboard className="w-4 h-4" strokeWidth={1.5} />
            Paste from Clipboard
          </button>
        </div>
      </div>
      
      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-structure/50">
        <CheckCircle2 className="w-4 h-4 text-alpha" strokeWidth={1.5} />
        <span>Processed locally. No cloud upload. Your data never leaves your device.</span>
      </div>
      
      {/* Results */}
      <AnimatePresence>
        {showResults && allTransactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Detection Summary */}
            <div className="bg-alpha/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-5 h-5 text-alpha" strokeWidth={1.5} />
                <h3 className="font-semibold text-structure">
                  Detected {allTransactions.length} Transactions
                </h3>
                <span className="text-sm text-structure/50 ml-auto">
                  Total: {formatCurrency(totalSummary.total, 0)}
                </span>
              </div>
              
              {/* Enhanced Category Pills with Icons */}
              {detectedCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detectedCategories.map((cat) => {
                    const theme = CATEGORY_THEMES[cat.category];
                    const Icon = theme?.icon;
                    const isSelected = selectedCategory === cat.category;
                    
                    return (
                      <motion.button
                        key={cat.category}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCategoryClick(cat.category)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                          "border-2",
                          isSelected
                            ? "text-white shadow-lg"
                            : "bg-surface text-structure hover:shadow-md"
                        )}
                        style={isSelected ? { 
                          backgroundColor: theme?.color || "#64748b",
                          borderColor: theme?.color || "#64748b",
                        } : {
                          borderColor: `${theme?.color || "#64748b"}40`,
                        }}
                      >
                        {Icon && (
                          <Icon 
                            className="w-4 h-4" 
                            strokeWidth={2}
                            style={!isSelected ? { color: theme?.color } : undefined}
                          />
                        )}
                        <span className="capitalize">{theme?.label || cat.category}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          isSelected ? "bg-white/20" : "bg-structure/10"
                        )}>
                          {cat.matchCount} · {formatCurrency(cat.totalAmount, 0)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-structure/50">
                  No known vice categories detected. Try selecting manually or paste different data.
                </p>
              )}
            </div>
            
            {/* Transaction List with Highlighting */}
            {allTransactions.length > 0 && (
              <div className="bg-surface rounded-xl border border-structure/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-structure/10">
                  <h3 className="font-semibold text-structure">
                    {selectedCategory ? (
                      <span className="flex items-center gap-2">
                        {CATEGORY_THEMES[selectedCategory]?.icon && (
                          <span style={{ color: CATEGORY_THEMES[selectedCategory]?.color }}>
                            {(() => {
                              const Icon = CATEGORY_THEMES[selectedCategory]?.icon;
                              return Icon ? <Icon className="w-4 h-4" strokeWidth={2} /> : null;
                            })()}
                          </span>
                        )}
                        <span className="capitalize">{CATEGORY_THEMES[selectedCategory]?.label || selectedCategory}</span>
                        <span className="text-structure/50 font-normal">
                          ({matchingTransactionIds.size} of {allTransactions.length})
                        </span>
                      </span>
                    ) : (
                      "All Transactions"
                    )}
                  </h3>
                  <span className="text-sm text-structure/50">
                    {selectedCategory 
                      ? `Selected: ${formatCurrency(summary.total, 0)}`
                      : `Total: ${formatCurrency(totalSummary.total, 0)}`
                    }
                  </span>
                </div>
                
                <div 
                  ref={transactionListRef}
                  className="max-h-80 overflow-y-auto"
                >
                  {allTransactions.map((tx, index) => {
                    const isMatch = matchingTransactionIds.has(index);
                    const theme = selectedCategory ? CATEGORY_THEMES[selectedCategory] : null;
                    const Icon = theme?.icon;
                    
                    // Check if this is the first matching transaction
                    const isFirstMatch = isMatch && 
                      !Array.from(matchingTransactionIds).some(id => id < index);
                    
                    return (
                      <motion.div
                        key={`${tx.date}-${tx.amount}-${index}`}
                        ref={isFirstMatch ? firstMatchRef : undefined}
                        layout
                        initial={false}
                        animate={isMatch && selectedCategory ? { 
                          scale: [1, 1.01, 1],
                        } : {}}
                        transition={{ 
                          duration: 0.3, 
                          delay: isMatch ? Math.min(index * 0.02, 0.5) : 0 
                        }}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 transition-all duration-300",
                          "border-b border-structure/5 last:border-b-0",
                          isMatch && selectedCategory && "border-l-4",
                          !isMatch && selectedCategory && "opacity-30"
                        )}
                        style={isMatch && theme ? { 
                          borderLeftColor: theme.color,
                          backgroundColor: `${theme.color}08`,
                        } : {}}
                      >
                        {/* Transaction content */}
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {isMatch && Icon && selectedCategory && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: Math.min(index * 0.02, 0.5) }}
                              className="flex-shrink-0"
                            >
                              <Icon 
                                className="w-4 h-4" 
                                style={{ color: theme?.color }}
                                strokeWidth={1.5}
                              />
                            </motion.div>
                          )}
                          <div className="min-w-0">
                            <p className={cn(
                              "text-sm truncate",
                              isMatch && selectedCategory ? "text-structure font-medium" : "text-structure"
                            )}>
                              {tx.description}
                            </p>
                            <p className="text-xs text-structure/50">
                              {formatDate(tx.date)}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-sm font-medium tabular-nums ml-4",
                          isMatch && selectedCategory ? "text-risk" : "text-structure/50"
                        )}>
                          {formatCurrency(tx.amount, 2)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Apply Button */}
            {selectedCategory && filteredTransactions.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleApply}
                className="btn-primary w-full flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: CATEGORY_THEMES[selectedCategory]?.color,
                }}
              >
                <span>Use {matchingTransactionIds.size} {CATEGORY_THEMES[selectedCategory]?.label || selectedCategory} Transactions</span>
                <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Summary Card */}
      <AnimatePresence>
        {selectedCategory && showResults && matchingTransactionIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div 
              className="flex items-center gap-4 px-6 py-4 rounded-2xl shadow-elevated bg-surface border-2 backdrop-blur-sm"
              style={{ borderColor: CATEGORY_THEMES[selectedCategory]?.color }}
            >
              <div className="flex items-center gap-2">
                {CATEGORY_THEMES[selectedCategory]?.icon && (
                  <span style={{ color: CATEGORY_THEMES[selectedCategory]?.color }}>
                    {(() => {
                      const Icon = CATEGORY_THEMES[selectedCategory]?.icon;
                      return Icon ? <Icon className="w-6 h-6" strokeWidth={2} /> : null;
                    })()}
                  </span>
                )}
                <span className="font-bold text-lg capitalize text-structure">
                  {CATEGORY_THEMES[selectedCategory]?.label}
                </span>
              </div>
              <div className="h-8 w-px bg-structure/20" />
              <div className="text-center">
                <div 
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: CATEGORY_THEMES[selectedCategory]?.color }}
                >
                  {formatCurrency(summary.total, 0)}
                </div>
                <div className="text-xs text-structure/60">
                  {matchingTransactionIds.size} transactions
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="ml-2 p-2 rounded-full hover:bg-structure/10 transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4 text-structure/60" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* No results */}
      {showResults && rawText && allTransactions.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-structure/20 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-structure/50">
            No transactions detected. Try pasting a bank statement with dates and amounts.
          </p>
        </div>
      )}
    </div>
  );
}
