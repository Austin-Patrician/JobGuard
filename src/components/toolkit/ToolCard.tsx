"use client";

import Link from "next/link";
import clsx from "clsx";

interface ToolCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  href: string;
  accentColor: "red" | "amber";
}

export default function ToolCard({
  title,
  subtitle,
  description,
  icon,
  href,
  accentColor,
}: ToolCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="paper-card p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
              {subtitle}
            </p>
            <h3 className="mt-2 font-display text-2xl sm:text-3xl">
              {title}
            </h3>
          </div>
          <div
            className={clsx(
              "flex h-12 w-12 items-center justify-center rounded-2xl text-2xl",
              accentColor === "red"
                ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                : "bg-amber-100 text-amber-600"
            )}
          >
            {icon}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
          {description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <span className="boss-chip">AI 分析</span>
            <span className="boss-chip">实时报告</span>
          </div>
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-semibold transition group-hover:opacity-90",
              accentColor === "red"
                ? "bg-[color:var(--accent)] text-white"
                : "bg-amber-500 text-white"
            )}
          >
            立即使用
          </span>
        </div>
      </div>
    </Link>
  );
}
