"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Trash2, FileText, DollarSign, Calendar } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useViceStore, useCalendarNotes, useViceConfig } from "@/store/vice-store";

interface DayDetailModalProps {
  date: string | null; // ISO date string, null when closed
  isClean: boolean;
  onClose: () => void;
}

export function DayDetailModal({ date, isClean, onClose }: DayDetailModalProps) {
  const calendarNotes = useCalendarNotes();
  const { viceAmount } = useViceConfig();
  const setCalendarNote = useViceStore((s) => s.setCalendarNote);
  const removeCalendarNote = useViceStore((s) => s.removeCalendarNote);
  
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Load existing note when date changes
  useEffect(() => {
    if (date && calendarNotes[date]) {
      setNoteText(calendarNotes[date]);
    } else {
      setNoteText("");
    }
  }, [date, calendarNotes]);
  
  if (!date) return null;
  
  // Get device locale for date formatting
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  
  const formattedDate = new Date(date).toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const isToday = date === new Date().toISOString().split("T")[0];
  const hasNote = !!calendarNotes[date];
  
  const handleSaveNote = () => {
    setIsSaving(true);
    setCalendarNote(date, noteText);
    setTimeout(() => {
      setIsSaving(false);
      if (!noteText.trim()) {
        // If note is empty, close modal
      }
    }, 300);
  };
  
  const handleDeleteNote = () => {
    removeCalendarNote(date);
    setNoteText("");
  };
  
  return (
    <AnimatePresence>
      {date && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-structure/20 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-surface rounded-xl shadow-elevated border border-structure/10 overflow-hidden mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-structure/10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isClean ? "bg-alpha/20" : "bg-structure/10"
                  )}>
                    <Calendar 
                      className={cn(
                        "w-5 h-5",
                        isClean ? "text-alpha" : "text-structure/60"
                      )} 
                      strokeWidth={1.5} 
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-structure">{formattedDate}</p>
                    <p className="text-sm text-structure/50">
                      {isToday ? "Today" : isClean ? "Clean day" : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-structure/40 hover:text-structure transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Savings Status */}
                {isClean && (
                  <div className="flex items-center gap-3 p-3 bg-alpha/10 rounded-lg">
                    <div className="w-8 h-8 bg-alpha/20 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-alpha" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-structure">
                        You saved {formatCurrency(viceAmount, 0)} this day
                      </p>
                      <p className="text-xs text-structure/50">
                        Keep up the great work!
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-alpha ml-auto" strokeWidth={2} />
                  </div>
                )}
                
                {/* Note Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-structure">
                      <FileText className="w-4 h-4" strokeWidth={1.5} />
                      Personal Note
                    </label>
                    {hasNote && (
                      <button
                        onClick={handleDeleteNote}
                        className="text-xs text-risk/70 hover:text-risk flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                        Delete
                      </button>
                    )}
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this day... (e.g., 'Felt tempted but stayed strong')"
                    className="input w-full h-24 resize-none text-sm"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-structure/40">
                      {noteText.length}/500 characters
                    </span>
                    <button
                      onClick={handleSaveNote}
                      disabled={isSaving || noteText === (calendarNotes[date] || "")}
                      className={cn(
                        "btn-primary text-sm px-4 py-1.5",
                        (isSaving || noteText === (calendarNotes[date] || "")) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isSaving ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


