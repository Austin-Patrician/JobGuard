"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { TalkTranslation } from "@/types/toolkit";

interface TalkTranslationCardProps {
  item: TalkTranslation;
  index: number;
}

const severityStyles = {
  high: "border-red-200 bg-red-50/80",
  medium: "border-amber-200 bg-amber-50/80",
  low: "border-emerald-200 bg-emerald-50/80",
};

const severityBadge = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

const severityLabel = {
  high: "高危",
  medium: "警告",
  low: "正常",
};

export default function TalkTranslationCard({
  item,
  index,
}: TalkTranslationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
      className={clsx(
        "rounded-2xl border p-4",
        severityStyles[item.severity]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-[color:var(--muted-ink)] line-through decoration-[color:var(--muted-ink)]/30">
            {item.original}
          </p>
          <p className="text-sm font-medium text-[color:var(--ink)]">
            {item.realMeaning}
          </p>
        </div>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            severityBadge[item.severity]
          )}
        >
          {severityLabel[item.severity]}
        </span>
      </div>
    </motion.div>
  );
}
