"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { ContractRiskItem } from "@/types/toolkit";

interface RiskSummaryTableProps {
  items: ContractRiskItem[];
}

const severityStyles = {
  high: { badge: "bg-red-100 text-red-700", label: "高危" },
  medium: { badge: "bg-amber-100 text-amber-700", label: "警告" },
  low: { badge: "bg-emerald-100 text-emerald-700", label: "正常" },
};

const categoryLabels: Record<string, string> = {
  salary: "薪资",
  probation: "试用期",
  resignation: "离职",
  liability: "责任",
  rights: "权益",
  other: "其他",
};

export default function RiskSummaryTable({ items }: RiskSummaryTableProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isExpanded = expandedIndex === index;
        const style = severityStyles[item.severity];

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
          >
            <button
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              className="w-full text-left"
            >
              <div
                className={clsx(
                  "rounded-xl border px-4 py-3 transition",
                  isExpanded
                    ? "border-[color:var(--accent)]/20 bg-white shadow-sm"
                    : "border-[color:var(--paper-edge)] bg-white/80 hover:bg-white"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={clsx(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        style.badge
                      )}
                    >
                      {style.label}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {categoryLabels[item.category] ?? item.category}
                    </span>
                    <p className="truncate text-sm text-[color:var(--ink)]">
                      {item.clause}
                    </p>
                  </div>
                  <svg
                    className={clsx(
                      "h-4 w-4 shrink-0 text-[color:var(--muted-ink)] transition",
                      isExpanded && "rotate-180"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 space-y-2 border-t border-[color:var(--paper-edge)] pt-3"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-ink)]">
                        法律依据
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ink)]">
                        {item.legalBasis}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-ink)]">
                        风险解释
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ink)]">
                        {item.explanation}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-ink)]">
                        修改建议
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--success)]">
                        {item.suggestion}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
