"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useCommunityStore } from "@/stores";
import type { RegionStat } from "@/types/community";
import { PROVINCE_PATHS } from "@/data/china-provinces";

const COLOR_SCALE = [
  "rgba(200, 200, 200, 0.4)", // 0 reports
  "rgba(179, 43, 43, 0.2)",   // tier 1
  "rgba(179, 43, 43, 0.4)",   // tier 2
  "rgba(179, 43, 43, 0.6)",   // tier 3
  "rgba(179, 43, 43, 0.85)",  // tier 4
];

function getColorTier(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface ChinaHeatmapProps {
  regions: RegionStat[];
}

export default function ChinaHeatmap({ regions }: ChinaHeatmapProps) {
  const setSelectedRegion = useCommunityStore((s) => s.setSelectedRegion);
  const selectedRegion = useCommunityStore((s) => s.selectedRegion);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const regionMap = useMemo(() => {
    const map = new Map<string, RegionStat>();
    for (const r of regions) map.set(r.region, r);
    return map;
  }, [regions]);

  const maxCount = useMemo(
    () => Math.max(1, ...regions.map((r) => r.report_count)),
    [regions]
  );

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.closest("svg")!.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
    });
  };

  return (
    <div className="relative">
      <svg viewBox="0 0 1000 800" className="w-full h-auto">
        {PROVINCE_PATHS.map(({ name, path }) => {
          const stat = regionMap.get(name);
          const count = stat?.report_count ?? 0;
          const tier = getColorTier(count, maxCount);
          const isSelected = selectedRegion === name;
          const isHovered = hovered === name;

          return (
            <motion.path
              key={name}
              d={path}
              fill={COLOR_SCALE[tier]}
              stroke={isSelected ? "var(--accent)" : "rgba(100,100,100,0.3)"}
              strokeWidth={isSelected ? 2 : 0.5}
              className="cursor-pointer"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: 1,
                scale: isHovered ? 1.02 : 1,
              }}
              transition={{ duration: 0.8, delay: 0.02 }}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              onMouseMove={handleMouseMove}
              onClick={() =>
                setSelectedRegion(selectedRegion === name ? null : name)
              }
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="heatmap-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold">{hovered}</p>
          <p className="text-xs opacity-80">
            {regionMap.get(hovered)?.report_count ?? 0} 份情报
          </p>
          {regionMap.get(hovered)?.top_tags.slice(0, 2).map((tag) => (
            <span key={tag} className="mr-1 text-[10px] opacity-70">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[color:var(--muted-ink)]">
        <span>少</span>
        {COLOR_SCALE.map((color, i) => (
          <div
            key={i}
            className="h-3 w-6 rounded-sm"
            style={{ background: color }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
