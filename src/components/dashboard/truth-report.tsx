"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Share2,
  Download,
  Copy,
  Check,
  TrendingUp,
  Flame,
  Vault,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import { cn, formatCurrency, getTodayISO } from "@/lib/utils";
import { useViceConfig, useCleanDays, useSelectedAsset } from "@/store/vice-store";
import { ASSETS } from "@/lib/constants";

interface TruthReportProps {
  portfolioValue: number;
  totalInvested: number;
  gainLoss: number;
  gainLossPercent: number;
  className?: string;
}

export function TruthReport({
  portfolioValue,
  totalInvested,
  gainLoss,
  gainLossPercent,
  className,
}: TruthReportProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { viceName, startDate } = useViceConfig();
  const cleanDays = useCleanDays();
  const selectedAsset = useSelectedAsset();
  
  const assetInfo = ASSETS.find((a) => a.symbol === selectedAsset);
  
  // Calculate streak
  const currentStreak = calculateStreak(cleanDays);
  
  // Format start date
  const formattedStartDate = startDate
    ? new Date(startDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Recently";
  
  // Generate image
  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;
    
    setIsGenerating(true);
    
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#EDEDED",
      });
      return dataUrl;
    } catch (err) {
      console.error("Failed to generate image:", err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);
  
  // Download as PNG
  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    
    const link = document.createElement("a");
    link.download = `vice-vault-truth-report-${getTodayISO()}.png`;
    link.href = dataUrl;
    link.click();
  };
  
  // Copy to clipboard
  const handleCopy = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    
    try {
      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  
  // Native share
  const handleShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    
    try {
      // Convert data URL to blob/file
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "truth-report.png", { type: "image/png" });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "My Vice Vault Truth Report",
          text: `If I had invested my ${viceName} money since ${formattedStartDate}, I would have ${formatCurrency(portfolioValue, 0)} today!`,
          files: [file],
        });
      } else {
        // Fallback: open modal with options
        setShowModal(true);
      }
    } catch (err) {
      console.error("Share failed:", err);
      setShowModal(true);
    }
  };
  
  return (
    <div className={cn("card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Truth Report</h2>
          <p className="text-sm text-structure/50">
            Share your transformation with the world
          </p>
        </div>
        
        <button
          onClick={handleShare}
          disabled={isGenerating}
          className="btn-primary flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" strokeWidth={1.5} />
          <span>{isGenerating ? "Generating..." : "Share"}</span>
        </button>
      </div>
      
      {/* Preview Card */}
      <div className="bg-canvas rounded-xl p-4 mb-4">
        <div
          ref={cardRef}
          className="bg-gradient-to-br from-structure to-structure/90 rounded-2xl p-8 text-surface"
        >
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-alpha/20 rounded-xl flex items-center justify-center">
              <Vault className="w-7 h-7 text-alpha" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Vice Vault</h3>
              <p className="text-sm text-surface/60">Truth Report</p>
            </div>
          </div>
          
          {/* The Truth Statement */}
          <div className="mb-8">
            <p className="text-surface/70 text-sm mb-2">If I had invested my</p>
            <p className="text-3xl font-bold text-alpha mb-2">
              {viceName || "vice"} money
            </p>
            <p className="text-surface/70 text-sm">
              into {assetInfo?.name || selectedAsset} since {formattedStartDate}...
            </p>
          </div>
          
          {/* The Number */}
          <div className="bg-surface/10 rounded-xl p-6 mb-8">
            <p className="text-surface/60 text-sm mb-1">I would have</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-alpha tabular-nums">
                {formatCurrency(portfolioValue, 0)}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-alpha" strokeWidth={1.5} />
                <span className={gainLoss >= 0 ? "text-alpha" : "text-risk"}>
                  {gainLoss >= 0 ? "+" : ""}{formatCurrency(gainLoss, 0)} ({gainLossPercent >= 0 ? "+" : ""}{gainLossPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-surface tabular-nums">
                {cleanDays.length}
              </div>
              <div className="text-xs text-surface/50">Clean Days</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-alpha" strokeWidth={1.5} />
                <span className="text-2xl font-bold text-surface tabular-nums">
                  {currentStreak}
                </span>
              </div>
              <div className="text-xs text-surface/50">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-surface tabular-nums">
                {formatCurrency(totalInvested, 0)}
              </div>
              <div className="text-xs text-surface/50">Invested</div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-surface/10">
            <p className="text-xs text-surface/40">
              vicevault.app
            </p>
            <p className="text-xs text-surface/40">
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="btn-ghost flex items-center gap-2"
        >
          <Download className="w-4 h-4" strokeWidth={1.5} />
          <span>Download</span>
        </button>
        <button
          onClick={handleCopy}
          disabled={isGenerating}
          className="btn-ghost flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-alpha" strokeWidth={1.5} />
              <span className="text-alpha">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" strokeWidth={1.5} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Share Modal (Fallback for non-native share) */}
      {showModal && (
        <ShareModal
          onClose={() => setShowModal(false)}
          onDownload={handleDownload}
          onCopy={handleCopy}
          copied={copied}
        />
      )}
    </div>
  );
}

interface ShareModalProps {
  onClose: () => void;
  onDownload: () => void;
  onCopy: () => void;
  copied: boolean;
}

function ShareModal({ onClose, onDownload, onCopy, copied }: ShareModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-structure/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-structure">Share Your Truth</h3>
          <button onClick={onClose} className="text-structure/40 hover:text-structure">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={onDownload}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-structure/10 hover:bg-canvas/50 transition-colors"
          >
            <Download className="w-5 h-5 text-structure/60" strokeWidth={1.5} />
            <div className="text-left">
              <div className="font-medium text-structure">Download Image</div>
              <div className="text-sm text-structure/50">Save to your device</div>
            </div>
          </button>
          
          <button
            onClick={onCopy}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-structure/10 hover:bg-canvas/50 transition-colors"
          >
            {copied ? (
              <Check className="w-5 h-5 text-alpha" strokeWidth={1.5} />
            ) : (
              <Copy className="w-5 h-5 text-structure/60" strokeWidth={1.5} />
            )}
            <div className="text-left">
              <div className="font-medium text-structure">
                {copied ? "Copied!" : "Copy to Clipboard"}
              </div>
              <div className="text-sm text-structure/50">Paste anywhere</div>
            </div>
          </button>
        </div>
        
        <p className="text-xs text-structure/40 text-center mt-6">
          Share your transformation on social media!
        </p>
      </motion.div>
    </motion.div>
  );
}

/**
 * Calculate current streak
 */
function calculateStreak(cleanDays: string[]): number {
  if (!cleanDays.length) return 0;
  
  const sorted = [...cleanDays].sort().reverse();
  const today = getTodayISO();
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  if (sorted[0] !== today && sorted[0] !== yesterdayStr) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = new Date(sorted[0]);
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split("T")[0];
    
    if (sorted[i] === prevDateStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  return streak;
}

