"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { API_ROUTES } from "@/lib/constants";
import TagCloud from "@/components/community/TagCloud";
import StatsBar from "@/components/community/StatsBar";
import ReportFeed from "@/components/community/ReportFeed";
import MapLegend from "@/components/community/MapLegend";
import type { CommunityStats } from "@/types/community";

const ChinaMap = dynamic(() => import("@/components/community/ChinaMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-[color:var(--paper)] opacity-40 rounded-2xl" />
  ),
});

export default function CommunityPage() {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    fetch(API_ROUTES.COMMUNITY.STATS)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const topScamType = stats?.top_tags?.[0]?.tag ?? null;

  return (
    <div className="min-h-screen intel-surface text-[color:var(--ink)]">
      <div className="pointer-events-none absolute inset-0 grain-overlay opacity-20" />

      {/* Header: Title + Stats */}
      <section className="relative mx-auto max-w-6xl px-4 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">
              Module 3
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">避坑情报局</h1>
            <p className="max-w-lg text-sm text-[color:var(--muted-ink)]">
              匿名分享求职踩坑经历，AI 自动脱敏保护隐私。查看全国避坑热力图。
            </p>
          </div>
          <Link
            href="/community/submit"
            className="inline-block rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(179,43,43,0.3)] transition hover:-translate-y-0.5"
          >
            提交情报
          </Link>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative mx-auto max-w-6xl px-4 pb-8">
        <StatsBar
          totalReports={stats?.total_reports ?? 0}
          activeRegions={stats?.regions?.length ?? 0}
          topScamType={topScamType}
        />
      </section>

      {/* Tags + Industries */}
      <section className="relative mx-auto max-w-6xl px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid gap-6 sm:grid-cols-2"
        >
          <div className="paper-card p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
              骗术标签
            </p>
            <TagCloud tags={stats?.top_tags ?? []} />
          </div>

          {stats?.top_industries && stats.top_industries.length > 0 && (
            <div className="paper-card p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
                高发行业
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.top_industries.map(({ industry, count }) => (
                  <span key={industry} className="tag-chip">
                    {industry}
                    <span className="ml-1 opacity-60">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Map */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="paper-card relative overflow-hidden h-[520px]"
        >
          <ChinaMap regions={stats?.regions ?? []} />
          <div className="absolute bottom-3 right-3 z-10">
            <MapLegend />
          </div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="h-px bg-[color:var(--paper-edge)]" />
      </div>

      {/* Feed */}
      <section className="relative mx-auto max-w-6xl px-4 pt-10 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <p className="mb-6 text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
            情报动态
          </p>
          <ReportFeed />
        </motion.div>
      </section>
    </div>
  );
}
