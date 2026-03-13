"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { RiskLevel } from "@/types/toolkit";

interface TrafficLightProps {
  riskLevel: RiskLevel;
}

const config: Record<RiskLevel, { label: string; color: string; bgActive: string; bgInactive: string }> = {
  safe: {
    label: "安全",
    color: "text-emerald-700",
    bgActive: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.6)]",
    bgInactive: "bg-emerald-900/20",
  },
  suspicious: {
    label: "可疑",
    color: "text-amber-700",
    bgActive: "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.6)]",
    bgInactive: "bg-amber-900/20",
  },
  dangerous: {
    label: "危险",
    color: "text-red-700",
    bgActive: "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.6)]",
    bgInactive: "bg-red-900/20",
  },
};

const lights: RiskLevel[] = ["safe", "suspicious", "dangerous"];

export default function TrafficLight({ riskLevel }: TrafficLightProps) {
  const active = config[riskLevel];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="inline-flex flex-col items-center gap-3"
    >
      <div className="flex items-center gap-3 rounded-full bg-gray-900 px-5 py-3">
        {lights.map((level) => {
          const isActive = level === riskLevel;
          const c = config[level];
          return (
            <motion.div
              key={level}
              className={clsx(
                "h-7 w-7 rounded-full transition-all",
                isActive ? c.bgActive : c.bgInactive
              )}
              animate={
                isActive
                  ? { scale: [1, 1.15, 1], opacity: [1, 0.85, 1] }
                  : {}
              }
              transition={
                isActive
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
            />
          );
        })}
      </div>
      <p className={clsx("text-sm font-semibold", active.color)}>
        {active.label}
      </p>
    </motion.div>
  );
}
