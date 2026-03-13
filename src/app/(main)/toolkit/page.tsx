"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import ToolCard from "@/components/toolkit/ToolCard";
import { useToolkitStore } from "@/stores";
import type { RiskLevel } from "@/types/toolkit";

const riskDot: Record<RiskLevel, string> = {
  safe: "bg-emerald-400",
  suspicious: "bg-amber-400",
  dangerous: "bg-red-500",
};

const riskLabel: Record<RiskLevel, string> = {
  safe: "安全",
  suspicious: "可疑",
  dangerous: "危险",
};

const riskBadge: Record<RiskLevel, string> = {
  safe: "bg-emerald-100 text-emerald-700",
  suspicious: "bg-amber-100 text-amber-700",
  dangerous: "bg-red-100 text-red-700",
};

const toolLabel: Record<string, string> = {
  mirror: "照妖镜",
  contract: "合同避雷针",
};

export default function ToolkitHubPage() {
  const history = useToolkitStore((s) => s.history);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen story-surface text-[color:var(--ink)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">
              JobGuard · Toolkit
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">
              实用防御工具箱
            </h1>
            <p className="text-sm text-[color:var(--muted-ink)]">
              粘贴 JD、上传聊天截图或合同照片，AI 自动分析风险并给出建议。
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-[color:var(--accent)]"
          >
            返回首页
          </Link>
        </header>

        <section className="mt-10 grid gap-6 sm:grid-cols-2">
          <ToolCard
            title="照妖镜"
            subtitle="JD / 聊天分析"
            description="粘贴招聘 JD 或聊天记录，AI 自动识别话术陷阱，翻译 HR 真实含义，给出红绿灯评级。"
            icon="🔍"
            href="/toolkit/mirror"
            accentColor="red"
          />
          <ToolCard
            title="合同避雷针"
            subtitle="合同风险扫描"
            description="上传劳动合同照片或粘贴条款文本，AI 逐条分析风险、引用法条、给出修改建议。"
            icon="📋"
            href="/toolkit/contract"
            accentColor="amber"
          />
        </section>

        {history.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">最近分析</h2>
              <p className="text-xs text-[color:var(--muted-ink)]">
                最近 {history.length} 条记录
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {history.slice(0, 6).map((record) => {
                const isExpanded = expandedId === record.id;
                return (
                  <div key={record.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : record.id)
                      }
                      className={clsx(
                        "w-full text-left story-card p-4 transition",
                        isExpanded
                          ? "ring-1 ring-[color:var(--accent)]/20"
                          : "hover:-translate-y-0.5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={clsx(
                            "h-2.5 w-2.5 rounded-full",
                            riskDot[record.riskLevel]
                          )}
                        />
                        <span className="text-xs font-semibold text-[color:var(--muted-ink)]">
                          {toolLabel[record.tool]}
                        </span>
                        <span
                          className={clsx(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            riskBadge[record.riskLevel]
                          )}
                        >
                          {riskLabel[record.riskLevel]}
                        </span>
                        <span className="text-[10px] text-[color:var(--muted-ink)]">
                          评分 {record.score}
                        </span>
                        <span className="ml-auto text-[10px] text-[color:var(--muted-ink)]">
                          {new Date(record.timestamp).toLocaleDateString(
                            "zh-CN",
                            { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                        <svg
                          className={clsx(
                            "h-3.5 w-3.5 shrink-0 text-[color:var(--muted-ink)] transition",
                            isExpanded && "rotate-180"
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-[color:var(--ink)]">
                        {record.summary}
                      </p>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1 rounded-2xl border border-[color:var(--paper-edge)] bg-white px-5 py-4">
                            <div className="flex flex-wrap items-start gap-6">
                              <div className="flex-1 min-w-[200px]">
                                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                                  分析摘要
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink)]">
                                  {record.summary}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                                  安全评分
                                </p>
                                <p
                                  className={clsx(
                                    "mt-1 font-display text-3xl",
                                    record.score >= 70
                                      ? "text-emerald-600"
                                      : record.score >= 30
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  )}
                                >
                                  {record.score}
                                </p>
                              </div>
                            </div>
                            {record.inputPreview && (
                              <div className="mt-4 border-t border-[color:var(--paper-edge)] pt-3">
                                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                                  输入内容
                                </p>
                                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[color:var(--muted-ink)]">
                                  {record.inputPreview}
                                </p>
                              </div>
                            )}
                            <div className="mt-4 flex items-center justify-end">
                              <Link
                                href={`/toolkit/${record.tool}`}
                                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                              >
                                再次分析
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
