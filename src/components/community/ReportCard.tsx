"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import VoteButton from "./VoteButton";
import type { CommunityReport } from "@/types/community";

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

interface ReportCardProps {
  report: CommunityReport;
  index: number;
}

export default function ReportCard({ report, index }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const measureOverflow = useCallback(() => {
    const element = contentRef.current;
    if (!element) {
      setCanExpand(false);
      return;
    }

    setCanExpand(element.scrollHeight - element.clientHeight > 1);
  }, []);

  useEffect(() => {
    if (expanded) return;

    const frame = requestAnimationFrame(measureOverflow);
    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          measureOverflow();
        })
      : null;

    const element = contentRef.current;
    if (resizeObserver && element) {
      resizeObserver.observe(element);
    }

    window.addEventListener("resize", measureOverflow);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [expanded, measureOverflow, report.sanitized_content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="report-card"
    >
      {/* Top: chips + time */}
      <div className="flex flex-wrap items-center gap-2">
        {report.region && (
          <span className="tag-chip">{report.region}</span>
        )}
        {report.industry && (
          <span className="tag-chip">{report.industry}</span>
        )}
        <span className="ml-auto text-xs text-[color:var(--muted-ink)]">
          {timeAgo(report.created_at)}
        </span>
      </div>

      {/* Summary */}
      {report.summary && (
        <p className="mt-3 text-sm font-semibold text-[color:var(--ink)]">
          {report.summary}
        </p>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        className={`mt-2 text-sm leading-relaxed text-[color:var(--muted-ink)] ${
          !expanded ? "line-clamp-3" : ""
        }`}
      >
        <ReactMarkdown
          rehypePlugins={[rehypeSanitize]}
          components={{
            p: ({ children }) => <p className="mb-2">{children}</p>,
          }}
        >
          {report.sanitized_content}
        </ReactMarkdown>
      </div>
      {(canExpand || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-[color:var(--accent)] hover:underline"
        >
          {expanded ? "收起" : "展开全文"}
        </button>
      )}

      {/* Tags */}
      {report.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {report.tags.map((tag) => (
            <span key={tag} className="tag-chip text-[10px]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 border-t border-[color:var(--paper-edge)] pt-3">
        <VoteButton reportId={report.id} initialUpvotes={report.upvotes} />
        <span className="text-xs text-[color:var(--muted-ink)]">
          {report.view_count} 次查看
        </span>
        <Link
          href={`/community/${report.id}`}
          className="ml-auto inline-flex items-center rounded-full border border-[color:var(--paper-edge)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          查看详情
        </Link>
      </div>
    </motion.div>
  );
}
