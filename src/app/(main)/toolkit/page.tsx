"use client";

import Link from "next/link";
import clsx from "clsx";
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

const salaryClarityLabel: Record<string, string> = {
  clear: "明确",
  vague: "模糊",
  missing: "缺失",
};

export default function ToolkitHubPage() {
  const history = useToolkitStore((s) => s.history);

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
                const recordResult = (record as { result?: any }).result;
                const isStale = !recordResult;
                const detailLink = isStale
                  ? `/toolkit/${record.tool}`
                  : `/toolkit/${record.tool}?historyId=${record.id}`;
                return (
                  <Link
                    key={record.id}
                    href={detailLink}
                    className={clsx(
                      "group block story-card p-4 transition",
                      isStale ? "opacity-80" : "hover:-translate-y-0.5"
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
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--ink)]">
                      {record.summary}
                    </p>

                    {record.inputPreview && (
                      <p className="mt-2 line-clamp-2 text-xs text-[color:var(--muted-ink)]">
                        输入：{record.inputPreview}
                      </p>
                    )}

                    {recordResult && (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[color:var(--muted-ink)]">
                        {record.tool === "mirror" && (
                          <>
                            <span className="rounded-full bg-black/5 px-2 py-1">
                              红旗 {recordResult.redFlags?.length ?? 0} 条
                            </span>
                            <span className="rounded-full bg-black/5 px-2 py-1">
                              话术翻译 {recordResult.translations?.length ?? 0} 条
                            </span>
                          </>
                        )}
                        {record.tool === "contract" && (
                          <>
                            <span className="rounded-full bg-black/5 px-2 py-1">
                              风险条款 {recordResult.riskItems?.length ?? 0} 条
                            </span>
                            <span className="rounded-full bg-black/5 px-2 py-1">
                              薪资清晰度{" "}
                              {salaryClarityLabel[recordResult.salaryClarity] ?? "未知"}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="mt-3 text-xs font-semibold text-[color:var(--accent)]">
                      {isStale ? "记录缺少详情，重新分析" : "查看完整报告"} →
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
