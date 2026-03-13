"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCommunityStore } from "@/stores";
import { API_ROUTES, COMMUNITY_CONFIG } from "@/lib/constants";
import ReportCard from "./ReportCard";
import type { CommunityReport } from "@/types/community";

export default function ReportFeed() {
  const selectedRegion = useCommunityStore((s) => s.selectedRegion);
  const selectedTag = useCommunityStore((s) => s.selectedTag);
  const sortBy = useCommunityStore((s) => s.sortBy);
  const setSortBy = useCommunityStore((s) => s.setSortBy);
  const setSelectedRegion = useCommunityStore((s) => s.setSelectedRegion);
  const setSelectedTag = useCommunityStore((s) => s.setSelectedTag);

  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(COMMUNITY_CONFIG.DEFAULT_PAGE_SIZE),
        sort: sortBy,
      });
      if (selectedRegion) params.set("region", selectedRegion);
      if (selectedTag) params.set("tag", selectedTag);

      const res = await fetch(`${API_ROUTES.COMMUNITY.REPORTS}?${params}`);
      const data = await res.json();
      setReports((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedRegion, selectedTag]);

  useEffect(() => {
    setPage(1);
    fetchReports(1, false);
  }, [fetchReports]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReports(nextPage, true);
  };

  const hasMore = reports.length < total;

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {selectedRegion && (
          <button
            type="button"
            onClick={() => setSelectedRegion(null)}
            className="tag-chip !bg-[color:var(--accent-soft)] !text-[color:var(--accent)]"
          >
            {selectedRegion} &times;
          </button>
        )}
        {selectedTag && (
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className="tag-chip !bg-[color:var(--accent-soft)] !text-[color:var(--accent)]"
          >
            {selectedTag} &times;
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setSortBy("newest")}
            className={`rounded-full px-3 py-1 text-xs transition ${
              sortBy === "newest"
                ? "bg-[color:var(--ink)] text-[color:var(--paper)]"
                : "bg-black/5 text-[color:var(--muted-ink)]"
            }`}
          >
            最新
          </button>
          <button
            type="button"
            onClick={() => setSortBy("popular")}
            className={`rounded-full px-3 py-1 text-xs transition ${
              sortBy === "popular"
                ? "bg-[color:var(--ink)] text-[color:var(--paper)]"
                : "bg-black/5 text-[color:var(--muted-ink)]"
            }`}
          >
            热门
          </button>
        </div>
      </div>

      {/* Report list */}
      <div className="space-y-4">
        {reports.map((report, index) => (
          <ReportCard key={report.id} report={report} index={index} />
        ))}
      </div>

      {/* Empty state */}
      {!loading && reports.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center"
        >
          <p className="text-lg text-[color:var(--muted-ink)]">暂无情报</p>
          <p className="mt-2 text-sm text-[color:var(--muted-ink)]">
            成为第一个分享避坑经历的人
          </p>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--paper-edge)] border-t-[color:var(--accent)]" />
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-[color:var(--paper-edge)] px-6 py-2.5 text-sm text-[color:var(--muted-ink)] transition hover:bg-white"
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}
