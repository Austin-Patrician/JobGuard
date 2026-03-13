"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface StatsBarProps {
  totalReports: number;
  activeRegions: number;
  topScamType: string | null;
}

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target]);

  return <>{value}</>;
}

export default function StatsBar({ totalReports, activeRegions, topScamType }: StatsBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-panel rounded-2xl px-6 py-4"
    >
      <div className="grid grid-cols-3 divide-x divide-[color:var(--paper-edge)]">
        <div className="pr-4 text-center">
          <p className="font-display text-2xl text-[color:var(--ink)]">
            <AnimatedNumber target={totalReports} />
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted-ink)]">情报总数</p>
        </div>
        <div className="px-4 text-center">
          <p className="font-display text-2xl text-[color:var(--ink)]">
            <AnimatedNumber target={activeRegions} />
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted-ink)]">覆盖地区</p>
        </div>
        <div className="pl-4 text-center">
          <p className="font-display text-lg text-[color:var(--accent)]">
            {topScamType || "--"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted-ink)]">高发骗术</p>
        </div>
      </div>
    </motion.div>
  );
}
