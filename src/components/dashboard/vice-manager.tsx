"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Pause,
  Play,
  Cigarette,
  Wine,
  Coffee,
  Utensils,
  Dices,
  ShoppingBag,
  Tv,
  Leaf,
  DollarSign,
  Check,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useViceStore, useVices, useSubscriptionStatus } from "@/store/vice-store";
import { FREQUENCIES, VICE_PRESETS, type Frequency } from "@/lib/constants";
import type { Vice } from "@/types";

const ICON_MAP: Record<string, React.ElementType> = {
  Cigarette,
  Wine,
  Coffee,
  Utensils,
  Dices,
  ShoppingBag,
  Tv,
  Leaf,
};

const VICE_COLORS = [
  "#F43F5E", // rose
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
];

interface ViceManagerProps {
  className?: string;
}

export function ViceManager({ className }: ViceManagerProps) {
  const vices = useVices();
  const { status: subscriptionStatus } = useSubscriptionStatus();
  const addVice = useViceStore((s) => s.addVice);
  const updateVice = useViceStore((s) => s.updateVice);
  const removeVice = useViceStore((s) => s.removeVice);
  const toggleVice = useViceStore((s) => s.toggleVice);
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const isPro = subscriptionStatus === "active";
  const canAddMore = isPro || vices.length < 1;
  
  // Calculate totals
  const getAnnualCost = (vice: Vice) => {
    const multiplier = FREQUENCIES.find((f) => f.value === vice.frequency)?.multiplier || 52;
    return vice.amount * multiplier;
  };
  
  const totalAnnualCost = vices
    .filter((v) => v.isActive)
    .reduce((sum, v) => sum + getAnnualCost(v), 0);
  
  return (
    <div className={cn("card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-structure">Your Vices</h2>
          <p className="text-sm text-structure/50">
            Track multiple habits for a complete picture
          </p>
        </div>
        
        {canAddMore && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Add Vice</span>
          </button>
        )}
        
        {!canAddMore && (
          <div className="text-sm text-structure/50 bg-alpha/10 px-3 py-1.5 rounded-lg">
            Upgrade to Pro for unlimited vices
          </div>
        )}
      </div>
      
      {/* Vice List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {vices.map((vice, index) => (
            <motion.div
              key={vice.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {editingId === vice.id ? (
                <ViceEditForm
                  vice={vice}
                  onSave={(updates) => {
                    updateVice(vice.id, updates);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <ViceCard
                  vice={vice}
                  color={vice.color || VICE_COLORS[index % VICE_COLORS.length]}
                  annualCost={getAnnualCost(vice)}
                  onEdit={() => setEditingId(vice.id)}
                  onDelete={() => removeVice(vice.id)}
                  onToggle={() => toggleVice(vice.id)}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Empty State */}
        {vices.length === 0 && !isAddingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 border-2 border-dashed border-structure/10 rounded-xl"
          >
            <DollarSign className="w-12 h-12 text-structure/20 mx-auto mb-4" strokeWidth={1} />
            <p className="text-structure/50 mb-4">
              No vices tracked yet. Add your first one to start.
            </p>
            <button
              onClick={() => setIsAddingNew(true)}
              className="btn-primary"
            >
              Add Your First Vice
            </button>
          </motion.div>
        )}
        
        {/* Add New Form */}
        <AnimatePresence>
          {isAddingNew && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ViceEditForm
                onSave={(newVice) => {
                  addVice({
                    name: newVice.name || "New Vice",
                    amount: newVice.amount || 10,
                    frequency: newVice.frequency || "weekly",
                    icon: newVice.icon,
                    color: VICE_COLORS[vices.length % VICE_COLORS.length],
                    isActive: true,
                  });
                  setIsAddingNew(false);
                }}
                onCancel={() => setIsAddingNew(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Total Summary */}
      {vices.length > 0 && (
        <motion.div
          layout
          className="mt-6 pt-6 border-t border-structure/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-structure/60">
              Total Annual Cost ({vices.filter((v) => v.isActive).length} active)
            </span>
            <span className="text-2xl font-bold text-risk tabular-nums">
              {formatCurrency(totalAnnualCost, 0)}/year
            </span>
          </div>
          <p className="text-xs text-structure/40 mt-1">
            That&apos;s {formatCurrency(totalAnnualCost / 12, 0)}/month or {formatCurrency(totalAnnualCost / 52, 0)}/week
          </p>
        </motion.div>
      )}
    </div>
  );
}

interface ViceCardProps {
  vice: Vice;
  color: string;
  annualCost: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function ViceCard({ vice, color, annualCost, onEdit, onDelete, onToggle }: ViceCardProps) {
  const Icon = ICON_MAP[vice.icon || "DollarSign"] || DollarSign;
  const frequency = FREQUENCIES.find((f) => f.value === vice.frequency);
  
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-canvas/50 border transition-all",
        vice.isActive ? "border-transparent" : "border-structure/10 opacity-60"
      )}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} strokeWidth={1.5} />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-structure truncate">{vice.name}</h3>
          {!vice.isActive && (
            <span className="text-xs bg-structure/10 text-structure/50 px-2 py-0.5 rounded">
              Paused
            </span>
          )}
        </div>
        <p className="text-sm text-structure/50">
          {formatCurrency(vice.amount, 0)} {frequency?.label.toLowerCase()}
        </p>
      </div>
      
      {/* Annual Cost */}
      <div className="text-right hidden sm:block">
        <div className="text-lg font-bold text-risk tabular-nums">
          {formatCurrency(annualCost, 0)}
        </div>
        <p className="text-xs text-structure/40">per year</p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-structure/5 text-structure/40 hover:text-structure transition-colors"
          title={vice.isActive ? "Pause tracking" : "Resume tracking"}
        >
          {vice.isActive ? (
            <Pause className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <Play className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-structure/5 text-structure/40 hover:text-structure transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-risk/10 text-structure/40 hover:text-risk transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

interface ViceEditFormProps {
  vice?: Vice;
  onSave: (updates: Partial<Vice>) => void;
  onCancel: () => void;
}

function ViceEditForm({ vice, onSave, onCancel }: ViceEditFormProps) {
  const [name, setName] = useState(vice?.name || "");
  const [amount, setAmount] = useState(vice?.amount || 20);
  const [frequency, setFrequency] = useState<Frequency>(vice?.frequency || "weekly");
  const [selectedIcon, setSelectedIcon] = useState(vice?.icon || "");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, amount, frequency, icon: selectedIcon });
  };
  
  const selectPreset = (preset: typeof VICE_PRESETS[number]) => {
    setName(preset.name);
    setAmount(preset.defaultAmount);
    setFrequency(preset.defaultFrequency);
    setSelectedIcon(preset.icon);
  };
  
  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-alpha/30 bg-surface">
      {/* Preset Quick Select */}
      {!vice && (
        <div className="mb-4">
          <label className="label">Quick Select</label>
          <div className="grid grid-cols-4 gap-2">
            {VICE_PRESETS.slice(0, 8).map((preset) => {
              const Icon = ICON_MAP[preset.icon] || DollarSign;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                    "hover:border-alpha hover:bg-alpha/5",
                    name === preset.name ? "border-alpha bg-alpha/10" : "border-structure/10"
                  )}
                >
                  <Icon className="w-5 h-5 text-structure/60" strokeWidth={1.5} />
                  <span className="text-xs text-structure/80 truncate w-full text-center">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Name */}
      <div className="mb-4">
        <label className="label">Vice Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Morning Coffee"
          className="input"
          required
        />
      </div>
      
      {/* Amount & Frequency */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-structure/40">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              className="input pl-7 tabular-nums"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            className="input"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
        >
          <Check className="w-4 h-4" strokeWidth={1.5} />
          {vice ? "Save Changes" : "Add Vice"}
        </button>
      </div>
    </form>
  );
}

