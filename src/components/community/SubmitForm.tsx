"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import clsx from "clsx";
import { useVisitorId } from "@/hooks/useVisitorId";
import { API_ROUTES, COMMUNITY_CONFIG } from "@/lib/constants";
import ModerationLoadingState from "./ModerationLoadingState";
import type { SubmitReportResponse } from "@/types/community";

const EXAMPLE_STORIES = [
  {
    label: "培训贷骗局",
    text: `坐标深圳，2024年3月在某招聘平台看到一家科技公司招"互联网运营专员"，月薪8-12K，不限经验。\n\n面试时HR说要先参加为期3个月的"岗前培训"，培训费19800元，可以"先学后付"。签了一份培训协议后才发现是跟某贷款平台签的分期贷款合同。\n\n培训内容就是看视频，根本学不到东西。3个月后说"能力不达标"不予录用，但贷款每月要还1600多元。后来发现同批有20多个人都是一样的遭遇。\n\n公司叫深圳XX科技有限公司，在南山区某写字楼。`,
  },
  {
    label: "黑中介押金",
    text: `今年2月在广州找工作，通过一个叫"XX人力"的中介公司。他们收了500元"服务费"说保证3天内安排工作。\n\n等了一周都没消息，打电话过去一直说在安排。后来带我去了一家工厂，干了两天说不合适让我走，也不退中介费。\n\n再找他们时换了电话号码，去他们办公室发现已经搬走了。在天河区棠下村的一个小门面，现在已经人去楼空。\n\n后来在网上搜才发现很多人被骗，手法一模一样。`,
  },
];

export default function SubmitForm() {
  const visitorId = useVisitorId();
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<"input" | "moderating" | "result">("input");
  const [result, setResult] = useState<SubmitReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const charCount = content.length;
  const canSubmit =
    charCount >= COMMUNITY_CONFIG.CONTENT_MIN_LENGTH &&
    charCount <= COMMUNITY_CONFIG.CONTENT_MAX_LENGTH &&
    !!visitorId;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !visitorId) return;
    setError(null);
    setPhase("moderating");

    try {
      const res = await fetch(API_ROUTES.COMMUNITY.REPORTS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-visitor-id": visitorId,
        },
        body: JSON.stringify({ content, visitor_id: visitorId }),
      });
      const data: SubmitReportResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as unknown as { error: string }).error || "提交失败");
      }

      setResult(data);
      setPhase("result");
    } catch (err) {
      setError((err as Error).message);
      setPhase("input");
    }
  }, [canSubmit, visitorId, content]);

  const handleRetry = () => {
    setPhase("input");
    setResult(null);
    setError(null);
  };

  return (
    <div
      className={clsx(
        "min-h-screen transition-colors duration-500",
        phase === "input"
          ? "story-surface text-[color:var(--ink)]"
          : "night-surface text-white"
      )}
    >
      {phase !== "input" && (
        <div className="pointer-events-none absolute inset-0 grain-overlay opacity-40" />
      )}

      <div className="relative mx-auto max-w-3xl px-4 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p
              className={clsx(
                "text-xs uppercase tracking-[0.32em]",
                phase === "input" ? "text-[color:var(--muted-ink)]" : "text-white/60"
              )}
            >
              Community Intel
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">提交情报</h1>
            <p
              className={clsx(
                "text-sm",
                phase === "input" ? "text-[color:var(--muted-ink)]" : "text-white/70"
              )}
            >
              分享你的求职避坑经历，AI 将自动脱敏保护隐私。
            </p>
          </div>
          <Link
            href="/community"
            className={clsx(
              "text-xs font-semibold",
              phase === "input" ? "text-[color:var(--accent)]" : "text-white/70"
            )}
          >
            返回情报局
          </Link>
        </header>

        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-10"
            >
              <div className="paper-card mx-auto p-6 sm:p-8">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="描述你的经历：发生在哪里、什么公司/行业、遇到了什么问题、有什么证据或细节...&#10;&#10;Markdown 格式支持：**加粗**、- 列表项"
                  rows={12}
                  className="w-full resize-none rounded-xl border border-[color:var(--paper-edge)] bg-transparent px-4 py-3 text-sm leading-relaxed text-[color:var(--ink)] placeholder:text-[color:var(--muted-ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-[color:var(--muted-ink)]">
                    支持 Markdown 格式
                  </p>
                  <p
                    className={clsx(
                      "text-xs",
                      charCount < COMMUNITY_CONFIG.CONTENT_MIN_LENGTH
                        ? "text-[color:var(--muted-ink)]"
                        : charCount > COMMUNITY_CONFIG.CONTENT_MAX_LENGTH
                          ? "text-red-500"
                          : "text-[color:var(--success)]"
                    )}
                  >
                    {charCount} / {COMMUNITY_CONFIG.CONTENT_MAX_LENGTH}
                  </p>
                </div>

                {error && (
                  <p className="mt-3 text-xs text-[color:var(--accent)]">{error}</p>
                )}

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className={clsx(
                    "mt-6 w-full rounded-full py-3 text-sm font-semibold transition",
                    canSubmit
                      ? "bg-[color:var(--accent)] text-white hover:opacity-90"
                      : "bg-black/10 text-[color:var(--muted-ink)] cursor-not-allowed"
                  )}
                >
                  提交情报
                </button>

                <div className="mt-4 flex flex-wrap gap-2">
                  {EXAMPLE_STORIES.map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      onClick={() => setContent(example.text)}
                      className="rounded-full border border-[color:var(--paper-edge)] px-3 py-1.5 text-xs text-[color:var(--muted-ink)] transition hover:bg-white hover:text-[color:var(--ink)]"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {phase === "moderating" && (
            <motion.div
              key="moderating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-10"
            >
              <ModerationLoadingState />
            </motion.div>
          )}

          {phase === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10"
            >
              {result.status === "approved" ? (
                <div className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-lg">
                      &#x2713;
                    </span>
                    <div>
                      <h3 className="font-display text-xl">情报已发布</h3>
                      <p className="text-xs text-[color:var(--muted-ink)]">
                        感谢你的分享，已帮助更多人避坑
                      </p>
                    </div>
                  </div>

                  {result.summary && (
                    <p className="mt-4 text-sm font-semibold">{result.summary}</p>
                  )}

                  {result.tags && result.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {result.tags.map((tag) => (
                        <span key={tag} className="tag-chip">{tag}</span>
                      ))}
                    </div>
                  )}

                  {result.sanitized_content && (
                    <div className="mt-4 rounded-xl bg-black/5 p-4 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                      <p className="mb-2 text-xs font-semibold text-[color:var(--ink)]">
                        脱敏后内容：
                      </p>
                      {result.sanitized_content.slice(0, 300)}
                      {result.sanitized_content.length > 300 && "..."}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <Link
                      href="/community"
                      className="rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      查看情报局
                    </Link>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded-full border border-[color:var(--paper-edge)] px-5 py-2.5 text-sm text-[color:var(--muted-ink)] transition hover:bg-white"
                    >
                      继续提交
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-lg">
                      !
                    </span>
                    <div>
                      <h3 className="font-display text-xl">
                        {result.status === "rejected" ? "未通过审核" : "审核中"}
                      </h3>
                      <p className="text-xs text-[color:var(--muted-ink)]">
                        {result.status === "rejected"
                          ? "你的情报未通过 AI 审核"
                          : "你的情报需要进一步审核"}
                      </p>
                    </div>
                  </div>

                  {result.reject_reason && (
                    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                      <p className="font-semibold">原因：</p>
                      <p className="mt-1">{result.reject_reason}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-6 rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    修改重新提交
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
