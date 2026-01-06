"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  X,
  ArrowRight
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ParsedTransaction } from "@/lib/regex-parsers";

interface CSVImportProps {
  onTransactionsImported?: (transactions: ParsedTransaction[]) => void;
}

export function CSVImport({ onTransactionsImported }: CSVImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);
  
  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };
  
  // Process CSV file
  const processFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }
    
    setFile(file);
    setError(null);
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setTransactions(parsed);
    } catch {
      setError("Failed to parse CSV file. Please check the format.");
      setTransactions([]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Clear
  const handleClear = () => {
    setFile(null);
    setTransactions([]);
    setError(null);
  };
  
  // Apply
  const handleApply = () => {
    if (transactions.length) {
      onTransactionsImported?.(transactions);
    }
  };
  
  // Calculate total
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all",
          "flex flex-col items-center justify-center text-center",
          isDragging
            ? "border-alpha bg-alpha/5"
            : "border-structure/20 hover:border-structure/40",
          file && "border-alpha/50 bg-alpha/5"
        )}
      >
        {file ? (
          <>
            <FileSpreadsheet className="w-12 h-12 text-alpha mb-4" strokeWidth={1.5} />
            <p className="font-medium text-structure mb-1">{file.name}</p>
            <p className="text-sm text-structure/50">
              {transactions.length} transactions found
            </p>
            <button
              onClick={handleClear}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-structure/5 transition-colors"
              aria-label="Remove file"
            >
              <X className="w-4 h-4 text-structure/60" strokeWidth={1.5} />
            </button>
          </>
        ) : (
          <>
            <Upload 
              className={cn(
                "w-12 h-12 mb-4 transition-colors",
                isDragging ? "text-alpha" : "text-structure/30"
              )} 
              strokeWidth={1.5} 
            />
            <p className="font-medium text-structure mb-1">
              Drop your CSV file here
            </p>
            <p className="text-sm text-structure/50 mb-4">
              or click to browse
            </p>
            <label className="btn-ghost cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              Browse Files
            </label>
          </>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-surface/80 flex items-center justify-center rounded-xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-alpha border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>
      
      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-structure/50">
        <CheckCircle2 className="w-4 h-4 text-alpha" strokeWidth={1.5} />
        <span>Processed locally. No cloud upload.</span>
      </div>
      
      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-risk/10 rounded-lg text-risk"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Results */}
      <AnimatePresence>
        {transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Transaction List */}
            <div className="bg-surface rounded-xl border border-structure/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-structure/10">
                <h3 className="font-semibold text-structure">
                  Imported Transactions
                </h3>
                <span className="text-sm text-structure/50">
                  Total: {formatCurrency(total, 0)}
                </span>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {transactions.slice(0, 20).map((tx, index) => (
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
                
                {transactions.length > 20 && (
                  <div className="px-4 py-3 text-center text-sm text-structure/50">
                    +{transactions.length - 20} more transactions
                  </div>
                )}
              </div>
            </div>
            
            {/* Apply Button */}
            <button
              onClick={handleApply}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <span>Use These Transactions</span>
              <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Format Help */}
      <div className="text-sm text-structure/50 space-y-2">
        <p className="font-medium text-structure/70">Supported CSV formats:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Date, Description, Amount columns</li>
          <li>Bank export formats (Chase, Wells Fargo, BoA)</li>
          <li>First row should be headers</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Parse CSV content into transactions
 */
function parseCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  
  // Parse header row
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  
  // Find column indices
  const dateIndex = headers.findIndex((h) => 
    h.includes("date") || h === "posted" || h === "transaction date"
  );
  const descIndex = headers.findIndex((h) => 
    h.includes("description") || h.includes("merchant") || h.includes("name") || h === "payee"
  );
  const amountIndex = headers.findIndex((h) => 
    h.includes("amount") || h.includes("debit") || h === "withdrawal"
  );
  
  if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
    // Try fallback: assume Date, Description, Amount order
    if (headers.length >= 3) {
      return parseWithFallback(lines.slice(1));
    }
    throw new Error("Could not identify required columns");
  }
  
  // Parse data rows
  const transactions: ParsedTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    
    if (cols.length <= Math.max(dateIndex, descIndex, amountIndex)) continue;
    
    const date = normalizeDate(cols[dateIndex]);
    const description = cols[descIndex].trim();
    const amount = parseAmount(cols[amountIndex]);
    
    if (date && description && amount > 0) {
      transactions.push({
        date,
        description,
        amount,
        rawMatch: lines[i],
      });
    }
  }
  
  return transactions;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Fallback parser for simple CSV
 */
function parseWithFallback(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const line of lines) {
    const cols = parseCSVLine(line);
    if (cols.length >= 3) {
      const date = normalizeDate(cols[0]);
      const description = cols[1].trim();
      const amount = parseAmount(cols[2]);
      
      if (date && description && amount > 0) {
        transactions.push({
          date,
          description,
          amount,
          rawMatch: line,
        });
      }
    }
  }
  
  return transactions;
}

/**
 * Normalize date to ISO format
 */
function normalizeDate(dateStr: string): string {
  const cleaned = dateStr.replace(/"/g, "").trim();
  
  // MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [month, day, year] = cleaned.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // MM/DD/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(cleaned)) {
    const [month, day, year] = cleaned.split("/");
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  return "";
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[,$"()]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

