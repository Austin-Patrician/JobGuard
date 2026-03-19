"use client";

const COLORS = [
  "rgba(200, 200, 200, 0.4)",
  "rgba(179, 43, 43, 0.2)",
  "rgba(179, 43, 43, 0.4)",
  "rgba(179, 43, 43, 0.6)",
  "rgba(179, 43, 43, 0.85)",
];

export default function MapLegend() {
  return (
    <div className="glass-panel flex flex-wrap items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] text-[color:var(--muted-ink)] sm:flex-nowrap sm:text-xs">
      <span>少</span>
      {COLORS.map((color, i) => (
        <div
          key={i}
          className="h-3 w-5 rounded-sm sm:w-6"
          style={{ background: color }}
        />
      ))}
      <span>多</span>
    </div>
  );
}
