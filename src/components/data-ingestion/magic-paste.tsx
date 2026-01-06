"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clipboard, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ArrowRight
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { 
  parseStatementText, 
  categorizeTransactions, 
  detectViceCategory,
  calculateTransactionSummary,
  type ParsedTransaction 
} from "@/lib/regex-parsers";

interface MagicPasteProps {
  onTransactionsDetected?: (transactions: ParsedTransaction[], category: string) => void;
}

export function MagicPaste({ onTransactionsDetected }: MagicPasteProps) {
  const [rawText, setRawText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Parse transactions
  const allTransactions = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseStatementText(rawText);
  }, [rawText]);
  
  // Detect vice categories
  const detectedCategories = useMemo(() => {
    return detectViceCategory(allTransactions);
  }, [allTransactions]);
  
  // Filter by selected category
  const filteredTransactions = useMemo(() => {
    if (!selectedCategory) return allTransactions;
    return categorizeTransactions(allTransactions, selectedCategory);
  }, [allTransactions, selectedCategory]);
  
  // Summary stats
  const summary = useMemo(() => {
    return calculateTransactionSummary(filteredTransactions);
  }, [filteredTransactions]);
  
  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawText(text);
      setShowResults(true);
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
  
  return (
    <div className="space-y-6">
      {/* Textarea */}
      <div className="relative">
        <textarea
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setShowResults(true);
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
              </div>
              
              {/* Category Pills */}
              {detectedCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detectedCategories.map((cat) => (
                    <button
                      key={cat.category}
                      onClick={() => setSelectedCategory(
                        selectedCategory === cat.category ? null : cat.category
                      )}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                        selectedCategory === cat.category
                          ? "bg-risk text-white"
                          : "bg-structure/5 text-structure hover:bg-structure/10"
                      )}
                    >
                      <span className="capitalize">{cat.category}</span>
                      <span className="opacity-70">
                        ({cat.matchCount} · {formatCurrency(cat.totalAmount, 0)})
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-structure/50">
                  No known vice categories detected. Try selecting manually or paste different data.
                </p>
              )}
            </div>
            
            {/* Transaction List */}
            {filteredTransactions.length > 0 && (
              <div className="bg-surface rounded-xl border border-structure/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-structure/10">
                  <h3 className="font-semibold text-structure">
                    {selectedCategory ? (
                      <span className="capitalize">{selectedCategory} Transactions</span>
                    ) : (
                      "All Transactions"
                    )}
                  </h3>
                  <span className="text-sm text-structure/50">
                    Total: {formatCurrency(summary.total, 0)}
                  </span>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {filteredTransactions.slice(0, 20).map((tx, index) => (
                    <div
                      key={`${tx.date}-${tx.amount}-${index}`}
                      className={cn(
                        "flex items-center justify-between px-4 py-3",
                        "border-b border-structure/5 last:border-b-0",
                        index % 2 === 0 ? "bg-canvas/30" : ""
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-structure truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-structure/50">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-risk tabular-nums ml-4">
                        {formatCurrency(tx.amount, 2)}
                      </span>
                    </div>
                  ))}
                  
                  {filteredTransactions.length > 20 && (
                    <div className="px-4 py-3 text-center text-sm text-structure/50">
                      +{filteredTransactions.length - 20} more transactions
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Apply Button */}
            {selectedCategory && filteredTransactions.length > 0 && (
              <button
                onClick={handleApply}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <span>Use These Transactions</span>
                <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
              </button>
            )}
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

