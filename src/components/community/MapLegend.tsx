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
    <div className="glass-panel rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-[color:var(--muted-ink)]">
      <span>少</span>
      {COLORS.map((color, i) => (
        <div
          key={i}
          className="h-3 w-6 rounded-sm"
          style={{ background: color }}
        />
      ))}
      <span>多</span>
    </div>
  );
}
