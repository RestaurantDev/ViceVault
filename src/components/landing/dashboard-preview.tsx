"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { TrendingUp, DollarSign, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 3D Interactive Dashboard Preview
 * 
 * Uses Framer Motion for parallax layering and mouse-tracking rotation.
 */
export function DashboardPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mouse position values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring-smoothed rotation
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [10, -10]), {
    stiffness: 100,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-10, 10]), {
    stiffness: 100,
    damping: 30,
  });
  
  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };
  
  // Reset on mouse leave
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };
  
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-2xl mx-auto perspective-1000"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative"
      >
        {/* Main Dashboard Card */}
        <motion.div
          style={{ translateZ: 50 }}
          className="relative bg-surface rounded-2xl shadow-elevated p-6 border border-structure/5"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-structure">Ghost Portfolio</h3>
              <p className="text-sm text-structure/50">SPY (S&P 500)</p>
            </div>
            <div className="flex items-center gap-2 bg-alpha/10 text-alpha px-3 py-1.5 rounded-lg">
              <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm font-semibold">+127.4%</span>
            </div>
          </div>
          
          {/* Mock Chart */}
          <div className="h-48 relative mb-6">
            <MockChart />
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={DollarSign}
              label="Invested"
              value="$15,600"
              trend="neutral"
            />
            <StatCard
              icon={Target}
              label="Current Value"
              value="$35,478"
              trend="up"
            />
            <StatCard
              icon={Calendar}
              label="Clean Days"
              value="312"
              trend="up"
            />
          </div>
        </motion.div>
        
        {/* Floating Decoration Layer 1 */}
        <motion.div
          style={{ translateZ: 25 }}
          className="absolute -inset-4 bg-alpha/10 rounded-3xl -z-10"
        />
        
        {/* Floating Decoration Layer 2 */}
        <motion.div
          style={{ translateZ: 0 }}
          className="absolute -inset-8 bg-structure/5 rounded-3xl -z-20"
        />
      </motion.div>
      
      {/* Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-alpha/5 via-transparent to-transparent rounded-3xl pointer-events-none" />
    </div>
  );
}

/**
 * Mock chart SVG for the preview
 * Uses client-only rendering to avoid hydration mismatch with Framer Motion
 */
function MockChart() {
  const [mounted, setMounted] = useState(false);
  
  // Only render the animated chart after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Memoize the paths to ensure consistent values
  const paths = useMemo(() => ({
    portfolio: generateMockChartData(),
    cash: generateCashLine(),
  }), []);
  
  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="portfolioGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#80B5D7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#80B5D7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            y1={i * 37.5}
            x2="400"
            y2={i * 37.5}
            stroke="#133250"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
        ))}
      </svg>
    );
  }
  
  return (
    <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="portfolioGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#80B5D7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#80B5D7" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="0"
          y1={i * 37.5}
          x2="400"
          y2={i * 37.5}
          stroke="#133250"
          strokeOpacity="0.05"
          strokeWidth="1"
        />
      ))}
      
      {/* Cash spent line (dashed) */}
      <motion.path
        d={paths.cash}
        fill="none"
        stroke="#133250"
        strokeWidth="2"
        strokeDasharray="5 5"
        strokeOpacity="0.4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* Portfolio value area */}
      <motion.path
        d={`${paths.portfolio} L400,150 L0,150 Z`}
        fill="url(#portfolioGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
      
      {/* Portfolio value line */}
      <motion.path
        d={paths.portfolio}
        fill="none"
        stroke="#80B5D7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* Current value dot */}
      <motion.circle
        cx="400"
        cy="20"
        r="6"
        fill="#80B5D7"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 1.5 }}
      />
    </svg>
  );
}

function generateMockChartData(): string {
  const points: [number, number][] = [];
  const steps = 50;
  
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 400;
    // Exponential growth with some noise
    const progress = i / steps;
    const growth = Math.pow(progress, 1.5) * 130;
    const noise = Math.sin(i * 0.5) * 5;
    const y = 150 - growth - noise;
    points.push([x, Math.max(10, y)]);
  }
  
  return `M${points.map(([x, y]) => `${x},${y}`).join(" L")}`;
}

function generateCashLine(): string {
  const points: [number, number][] = [];
  const steps = 50;
  
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 400;
    // Linear growth
    const y = 150 - (i / steps) * 80;
    points.push([x, y]);
  }
  
  return `M${points.map(([x, y]) => `${x},${y}`).join(" L")}`;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
}

function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  return (
    <div className="bg-canvas/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon 
          className={cn(
            "w-4 h-4",
            trend === "up" && "text-alpha",
            trend === "down" && "text-risk",
            trend === "neutral" && "text-structure/60"
          )} 
          strokeWidth={1.5} 
        />
        <span className="text-xs text-structure/50">{label}</span>
      </div>
      <div className="text-lg font-bold text-structure tabular-nums">{value}</div>
    </div>
  );
}

