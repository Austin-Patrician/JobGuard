"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import VoteButton from "@/components/community/VoteButton";
import { API_ROUTES } from "@/lib/constants";
import type { CommunityReport } from "@/types/community";

function formatPublishedAt(dateStr: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

export default function CommunityReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = useMemo(() => {
    if (!params) return "";
    return Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  }, [params]);

  const [report, setReport] = useState<CommunityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setReport(null);
      setLoading(false);
      setError("情报链接无效");
      return;
    }

    let cancelled = false;

    async function loadReport() {
      setLoading(true);

      try {
        const res = await fetch(API_ROUTES.COMMUNITY.REPORT_DETAIL(reportId), {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to fetch report");
        }

        if (!cancelled) {
          setReport(data as CommunityReport);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setReport(null);
          setError("该情报不存在，或暂时无法查看。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  return (
    <div className="min-h-screen intel-surface text-[color:var(--ink)]">
      <div className="pointer-events-none absolute inset-0 grain-overlay opacity-20" />

      <section className="relative mx-auto max-w-4xl px-4 pt-10 pb-16 sm:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">
              Intelligence Archive
            </p>
            <h1 className="font-display text-3xl sm:text-5xl">情报详情</h1>
            <p className="max-w-2xl text-sm text-[color:var(--muted-ink)]">
              浏览完整情报正文，查看发布时间、标签、浏览量和社区支持情况。
            </p>
          </div>
          <Link
            href="/community"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--paper-edge)] bg-white/80 px-5 py-2.5 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:bg-white"
          >
            返回情报局
          </Link>
        </motion.div>

        {loading && (
          <div className="paper-card p-8">
            <div className="space-y-4 animate-pulse">
              <div className="h-4 w-32 rounded-full bg-[color:var(--paper-edge)]/60" />
              <div className="h-10 w-3/4 rounded-2xl bg-[color:var(--paper-edge)]/60" />
              <div className="h-24 rounded-3xl bg-[color:var(--paper-edge)]/40" />
              <div className="h-24 rounded-3xl bg-[color:var(--paper-edge)]/40" />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="paper-card p-8 text-center">
            <p className="font-display text-3xl text-[color:var(--ink)]">情报暂不可用</p>
            <p className="mt-3 text-sm text-[color:var(--muted-ink)]">{error}</p>
            <Link
              href="/community"
              className="mt-6 inline-flex items-center rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(179,43,43,0.24)] transition hover:-translate-y-0.5"
            >
              返回列表
            </Link>
          </div>
        )}

        {!loading && report && (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="paper-card overflow-hidden p-0"
          >
            <div className="border-b border-[color:var(--paper-edge)] bg-white/75 px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-wrap items-center gap-2">
                {report.region && (
                  <span className="tag-chip">{report.region}</span>
                )}
                {report.industry && (
                  <span className="tag-chip">{report.industry}</span>
                )}
                {report.city && (
                  <span className="tag-chip">{report.city}</span>
                )}
                <span className="w-full text-xs text-[color:var(--muted-ink)] sm:ml-auto sm:w-auto sm:text-right">
                  {timeAgo(report.created_at)}
                </span>
              </div>

              {report.summary && (
                <h2 className="mt-5 max-w-3xl font-display text-2xl leading-tight text-[color:var(--ink)] sm:text-4xl">
                  {report.summary}
                </h2>
              )}

              <div className="mt-5 grid gap-3 text-sm text-[color:var(--muted-ink)] sm:grid-cols-3">
                <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-white/70 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]/80">
                    发布时间
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--ink)]">
                    {formatPublishedAt(report.created_at)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-white/70 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]/80">
                    社区反馈
                  </p>
                  <div className="mt-2">
                    <VoteButton reportId={report.id} initialUpvotes={report.upvotes} />
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-white/70 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]/80">
                    浏览次数
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
                    {report.view_count}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-8 sm:py-8">
              {report.tags.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {report.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="max-w-none text-[color:var(--muted-ink)]">
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ children }) => <p className="mb-4 text-sm leading-7 sm:text-base sm:leading-8">{children}</p>,
                    ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-7 sm:text-base sm:leading-8">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-[color:var(--ink)]">{children}</strong>,
                  }}
                >
                  {report.sanitized_content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.article>
        )}
      </section>
    </div>
  );
}
