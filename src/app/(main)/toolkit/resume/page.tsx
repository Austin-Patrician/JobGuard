"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import InputModeSwitch from "@/components/toolkit/InputModeSwitch";
import TextInput from "@/components/toolkit/TextInput";
import FileUploader from "@/components/toolkit/FileUploader";
import TrafficLight from "@/components/toolkit/TrafficLight";
import AnalysisLoadingState from "@/components/toolkit/AnalysisLoadingState";
import ResultShareCard from "@/components/toolkit/ResultShareCard";
import { useToolkitStore } from "@/stores";
import { API_ROUTES } from "@/lib/constants";
import { createUuid } from "@/lib/uuid";
import type { ResumeOptimizationResult } from "@/types/toolkit";

const EXAMPLE_RESUME = `张三
求职方向：产品运营 / 用户增长

工作经历
某教育科技公司｜运营专员｜2022.06 - 2025.02
1. 负责社群日常运营和活动执行，协助完成拉新与转化。
2. 跟进用户反馈，与产品和销售团队沟通需求。
3. 参与内容选题整理、活动海报文案撰写和数据汇总。

项目经历
新用户增长活动
1. 参与暑期拉新活动方案执行，负责社群通知、报名统计、活动复盘。
2. 协调设计和销售，推动活动物料按时上线。

技能
Excel、PPT、基础 SQL、内容编辑、活动执行、跨部门沟通`;

const EXAMPLE_JD = `岗位名称：用户增长运营

岗位职责：
1. 负责拉新、激活、留存等增长目标拆解与执行，持续优化转化漏斗；
2. 能基于用户分层制定精细化运营策略，联动内容、产品、销售推动项目落地；
3. 跟踪活动数据，输出复盘分析，并沉淀增长方法论；
4. 熟悉社群运营、活动策划、内容转化等增长手段。

任职要求：
1. 具备 2 年以上运营经验，有教育、互联网或知识付费行业经验优先；
2. 数据敏感，能使用 Excel、SQL 做基础分析；
3. 具备跨部门协作能力，表达清晰，执行力强；
4. 简历中请体现具体成果、关键指标和项目贡献。`;

const STYLE_OPTIONS = [
  { value: "balanced", label: "平衡版", description: "兼顾自然表达、岗位匹配和真实性" },
  { value: "ats", label: "ATS 优先", description: "更强调关键词覆盖和标准化结构" },
  { value: "impact", label: "成果强化", description: "更强调已有事实的成果表达力度" },
] as const;

const fitLabels = {
  safe: "高匹配",
  suspicious: "待补强",
  dangerous: "低匹配",
} as const;

const severityRank = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const severityMeta = {
  high: {
    label: "高优先级",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    line: "from-rose-500/50 via-rose-400/10 to-transparent",
  },
  medium: {
    label: "中优先级",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    line: "from-amber-500/50 via-amber-400/10 to-transparent",
  },
  low: {
    label: "低优先级",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    line: "from-emerald-500/50 via-emerald-400/10 to-transparent",
  },
} as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function tryParseJSON(text: string): ResumeOptimizationResult | null {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (
      parsed.riskLevel &&
      typeof parsed.matchScore === "number" &&
      Array.isArray(parsed.missingKeywords) &&
      Array.isArray(parsed.rewrites)
    ) {
      return parsed as ResumeOptimizationResult;
    }
  } catch {
    return null;
  }
  return null;
}

export default function ResumeOptimizerPage() {
  const [resumeMode, setResumeMode] = useState<"text" | "pdf">("text");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [targetStyle, setTargetStyle] =
    useState<(typeof STYLE_OPTIONS)[number]["value"]>("balanced");
  const [streamedText, setStreamedText] = useState("");
  const [phase, setPhase] = useState<"input" | "analyzing" | "results">("input");
  const [error, setError] = useState<string | null>(null);

  const result = useToolkitStore((s) => s.currentResumeResult);
  const setResumeResult = useToolkitStore((s) => s.setResumeResult);
  const addHistory = useToolkitStore((s) => s.addHistory);
  const history = useToolkitStore((s) => s.history);
  const router = useRouter();
  const searchParams = useSearchParams();
  const historyId = searchParams.get("historyId");
  const abortRef = useRef<AbortController | null>(null);
  const resumeReady = resumeMode === "text" ? resumeText.trim().length >= 80 : !!pdfBase64;
  const jdReady = jobDescription.trim().length >= 30;

  const canSubmit = useMemo(() => {
    return resumeReady && jdReady;
  }, [resumeReady, jdReady]);

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    const file = newFiles[0];
    if (!file) return;
    setFiles([file]);
    setPdfBase64(await fileToBase64(file));
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (index === 0) setPdfBase64(null);
  }, []);

  useEffect(() => {
    if (!historyId) return;
    const record = history.find((item) => item.id === historyId && item.tool === "resume");
    const recordResult = (record as { result?: ResumeOptimizationResult } | undefined)?.result;
    if (recordResult) {
      setResumeResult(recordResult);
      setPhase("results");
      setStreamedText("");
      setError(null);
      return;
    }
    setResumeResult(null);
    setPhase("input");
  }, [historyId, history, setResumeResult]);

  const handleSubmit = useCallback(async () => {
    if (historyId) router.replace("/toolkit/resume");

    setError(null);
    setStreamedText("");
    setResumeResult(null);
    setPhase("analyzing");

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 75_000);

    try {
      const body =
        resumeMode === "text"
          ? { resumeMode: "text" as const, resumeText, jobDescription, targetStyle }
          : {
              resumeMode: "pdf" as const,
              resumePdfBase64: pdfBase64,
              jobDescription,
              targetStyle,
            };

      const response = await fetch(API_ROUTES.TOOLKIT.RESUME, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "分析请求失败");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamedText(accumulated);
        const partial = tryParseJSON(accumulated);
        if (partial) setResumeResult(partial);
      }

      const finalResult = tryParseJSON(accumulated);
      if (finalResult) {
        setResumeResult(finalResult);
        addHistory({
          id: createUuid(),
          tool: "resume",
          timestamp: Date.now(),
          inputPreview: `JD：${jobDescription.slice(0, 80)}`,
          riskLevel: finalResult.riskLevel,
          score: finalResult.matchScore,
          summary: finalResult.summary,
          result: finalResult,
        });
      }
      setPhase("results");
    } catch (err) {
      setError((err as Error).name === "AbortError" ? "请求超时，请重试" : (err as Error).message || "分析失败，请重试");
      setPhase("input");
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
    }
  }, [
    addHistory,
    historyId,
    jobDescription,
    pdfBase64,
    resumeMode,
    resumeText,
    router,
    setResumeResult,
    targetStyle,
  ]);

  const handleReset = useCallback(() => {
    setPhase("input");
    setResumeResult(null);
    setStreamedText("");
    setError(null);
    if (historyId) router.replace("/toolkit/resume");
  }, [historyId, router, setResumeResult]);

  const highIssues = result?.issues.filter((item) => item.severity === "high").length ?? 0;
  const sortedIssues = useMemo(
    () =>
      [...(result?.issues ?? [])].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity]
      ),
    [result?.issues]
  );
  const topActionQueue = sortedIssues.slice(0, 3);
  const fitMeterWidth = result ? `${Math.max(result.matchScore, 6)}%` : "0%";

  return (
    <div className={clsx("min-h-screen transition-colors duration-500", phase === "input" ? "story-surface text-[color:var(--ink)]" : "night-surface text-white")}>
      {phase !== "input" && <div className="pointer-events-none absolute inset-0 grain-overlay opacity-40" />}

      <div className="relative mx-auto max-w-7xl px-4 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className={clsx("text-xs uppercase tracking-[0.32em]", phase === "input" ? "text-[color:var(--muted-ink)]" : "text-white/60")}>
              Toolkit · Resume Optimizer
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">简历优化器</h1>
            <p className={clsx("max-w-2xl text-sm", phase === "input" ? "text-[color:var(--muted-ink)]" : "text-white/70")}>
              原稿在左，JD 在右，底部只决定改写方向。
            </p>
          </div>
          <Link href="/toolkit" className={clsx("text-xs font-semibold", phase === "input" ? "text-sky-700" : "text-white/70")}>
            返回工具箱
          </Link>
        </header>

        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45 }}
              className="mt-10 grid gap-6 xl:grid-cols-[0.36fr_1fr]"
            >
              <motion.aside
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08, duration: 0.45 }}
                className="overflow-hidden rounded-[32px] border border-white/65 bg-[linear-gradient(165deg,rgba(248,251,255,0.94),rgba(233,242,255,0.82)_58%,rgba(255,247,241,0.84))] p-6 shadow-[0_28px_70px_-42px_rgba(62,92,138,0.42)] sm:p-8"
              >
                <span className="inline-flex rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-700">
                  Resume Studio
                </span>

                <h2 className="mt-5 max-w-xs font-display text-4xl leading-tight text-[color:var(--ink)] sm:text-5xl">
                  把原稿对齐到岗位。
                </h2>

                <div className="mt-8 space-y-3">
                  <div className="flex items-center justify-between rounded-[18px] bg-white/66 px-4 py-3">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">简历原稿</p>
                    <span className={clsx("h-2.5 w-2.5 rounded-full", resumeReady ? "bg-emerald-500" : "bg-slate-300")} />
                  </div>
                  <div className="flex items-center justify-between rounded-[18px] bg-white/66 px-4 py-3">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">岗位 JD</p>
                    <span className={clsx("h-2.5 w-2.5 rounded-full", jdReady ? "bg-emerald-500" : "bg-slate-300")} />
                  </div>
                  <div className="rounded-[22px] bg-[linear-gradient(160deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] p-4 text-white shadow-[0_18px_44px_-34px_rgba(15,23,42,0.9)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                      Output
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white/92">
                      匹配度 + 缺口词 + 改写片段
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResumeMode("text");
                      setResumeText(EXAMPLE_RESUME);
                      setJobDescription(EXAMPLE_JD);
                    }}
                    className="rounded-full border border-[color:var(--paper-edge)] bg-white/92 px-4 py-2 text-xs font-semibold text-[color:var(--ink)] transition hover:bg-white"
                  >
                    填入示例
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeText("");
                      setJobDescription("");
                      setFiles([]);
                      setPdfBase64(null);
                    }}
                    className="rounded-full border border-[color:var(--paper-edge)] px-4 py-2 text-xs font-semibold text-[color:var(--muted-ink)] transition hover:bg-white/70"
                  >
                    清空
                  </button>
                </div>
              </motion.aside>

              <motion.div
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14, duration: 0.45 }}
                className="overflow-hidden rounded-[32px] border border-black/6 bg-white/72 shadow-[0_28px_70px_-48px_rgba(62,92,138,0.3)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/6 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                      Source
                    </p>
                    <InputModeSwitch
                      mode={resumeMode}
                      onModeChange={(mode) => setResumeMode(mode as "text" | "pdf")}
                      theme="sky"
                      options={[
                        { value: "text", label: "粘贴文本" },
                        { value: "pdf", label: "上传 PDF" },
                      ]}
                    />
                  </div>

                  <div className="hidden items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-ink)] sm:flex">
                    <span className="flex items-center gap-2">
                      <span className={clsx("h-2 w-2 rounded-full", resumeReady ? "bg-emerald-500" : "bg-slate-300")} />
                      Resume
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={clsx("h-2 w-2 rounded-full", jdReady ? "bg-emerald-500" : "bg-slate-300")} />
                      JD
                    </span>
                  </div>
                </div>

                <motion.div
                  className="grid xl:grid-cols-[1fr_1fr]"
                >
                  <div className="p-5 sm:p-6 xl:border-r xl:border-black/6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[color:var(--ink)]">简历原稿</p>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold text-[color:var(--muted-ink)]">
                        {resumeMode === "text" ? "Text" : "PDF"}
                      </span>
                    </div>

                    {resumeMode === "text" ? (
                      <TextInput
                        value={resumeText}
                        onChange={setResumeText}
                        placeholder="粘贴你的简历全文..."
                        minLength={80}
                        maxLength={25000}
                      />
                    ) : (
                      <FileUploader
                        files={files}
                        onFilesSelected={handleFilesSelected}
                        onRemove={handleRemoveFile}
                        maxFiles={1}
                        maxSizeMB={5}
                        label="拖拽或点击导入 PDF"
                        description="文本型 PDF"
                      />
                    )}
                  </div>

                  <div className="border-t border-black/6 p-5 sm:p-6 xl:border-t-0">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[color:var(--ink)]">岗位 JD</p>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold text-[color:var(--muted-ink)]">
                        Target
                      </span>
                    </div>

                    <TextInput
                      value={jobDescription}
                      onChange={setJobDescription}
                      placeholder="粘贴目标岗位 JD..."
                      minLength={30}
                      maxLength={8000}
                    />
                  </div>
                </motion.div>

                <div className="border-t border-black/6 bg-[linear-gradient(180deg,rgba(248,250,255,0.88),rgba(255,255,255,0.72))] px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                        Rewrite Focus
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {STYLE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setTargetStyle(option.value)}
                            className={clsx(
                              "rounded-full border px-4 py-2 text-xs font-semibold transition",
                              targetStyle === option.value
                                ? "border-sky-300 bg-sky-600 text-white shadow-[0_14px_30px_-20px_rgba(2,132,199,0.7)]"
                                : "border-[color:var(--paper-edge)] bg-white/90 text-[color:var(--ink)] hover:bg-white"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {error && (
                        <p className="text-xs font-medium text-[color:var(--accent)]">
                          {error}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                        className={clsx(
                          "rounded-full px-6 py-3 text-sm font-semibold transition sm:min-w-[180px]",
                          canSubmit
                            ? "bg-sky-600 text-white shadow-[0_18px_36px_-24px_rgba(2,132,199,0.75)] hover:opacity-90"
                            : "cursor-not-allowed bg-black/10 text-[color:var(--muted-ink)]"
                        )}
                      >
                        生成优化报告
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.section>
          )}

          {phase === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-10">
              <AnalysisLoadingState text="AI 正在比对简历和岗位要求..." progress="正在提取关键词、识别缺口并生成可直接改写的表达" />
              {streamedText && (
                <div className="mx-auto mt-6 max-w-3xl">
                  <div className="story-card rounded-3xl p-4 text-sm leading-relaxed text-[color:var(--ink)] opacity-60">
                    {streamedText.slice(0, 260)}...
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-8">
              {result ? (
                <>
                  <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(249,252,255,0.92),rgba(232,241,255,0.78)_52%,rgba(255,255,255,0.75))] text-[color:var(--ink)] shadow-[0_30px_80px_-40px_rgba(57,84,124,0.45)]"
                  >
                    <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
                      <div className="border-b border-black/5 p-6 sm:p-8 xl:border-b-0 xl:border-r">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                            Resume Match Board
                          </span>
                          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-semibold text-[color:var(--muted-ink)]">
                            {fitLabels[result.riskLevel]}
                          </span>
                        </div>

                        <h2 className="mt-5 max-w-3xl font-display text-3xl leading-tight sm:text-4xl">
                          先修高影响问题，再把现有经历改写成更贴近岗位的话。
                        </h2>

                        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--muted-ink)] sm:text-[15px]">
                          {result.summary}
                        </p>

                        <div className="mt-8 grid gap-4 lg:grid-cols-3">
                          <div className="rounded-[24px] bg-white/68 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                              当前优势
                            </p>
                            <ul className="mt-3 space-y-2">
                              {result.strengths.slice(0, 3).map((item, index) => (
                                <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-[color:var(--ink)]">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-[24px] bg-white/68 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                              先处理这三件事
                            </p>
                            <div className="mt-3 space-y-2.5">
                              {topActionQueue.map((issue, index) => (
                                <div key={`${issue.section}-${index}`} className="flex items-start gap-3">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[11px] font-semibold text-white">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[color:var(--ink)]">
                                      {issue.section}
                                    </p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted-ink)]">
                                      {issue.problem}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[24px] bg-[linear-gradient(160deg,rgba(15,23,42,0.95),rgba(30,41,59,0.9))] p-4 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                              缺口词预览
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {result.missingKeywords.slice(0, 6).map((keyword) => (
                                <span key={keyword} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/88">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
                              Match Score
                            </p>
                            <p className={clsx("mt-3 font-display text-6xl leading-none", result.matchScore >= 80 ? "text-emerald-600" : result.matchScore >= 50 ? "text-amber-600" : "text-rose-600")}>
                              {result.matchScore}
                            </p>
                            <p className="mt-2 text-xs font-medium text-[color:var(--muted-ink)]">
                              / 100 岗位贴合度
                            </p>
                          </div>
                          <TrafficLight riskLevel={result.riskLevel} />
                        </div>

                        <div className="mt-6">
                          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                            <span>岗位贴合度曲线</span>
                            <span>{fitLabels[result.riskLevel]}</span>
                          </div>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-900/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: fitMeterWidth }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={clsx("h-full rounded-full", result.matchScore >= 80 ? "bg-[linear-gradient(90deg,#2e7d5d,#53b88b)]" : result.matchScore >= 50 ? "bg-[linear-gradient(90deg,#d39a3a,#f3c160)]" : "bg-[linear-gradient(90deg,#c43d54,#ff8a7a)]")}
                            />
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <div className="rounded-[22px] border border-black/6 bg-white/75 p-4">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">缺口词</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{result.missingKeywords.length}</p>
                          </div>
                          <div className="rounded-[22px] border border-black/6 bg-white/75 p-4">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">高优先级</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{highIssues}</p>
                          </div>
                          <div className="rounded-[22px] border border-black/6 bg-white/75 p-4">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">改写段落</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{result.rewrites.length}</p>
                          </div>
                          <div className="rounded-[22px] border border-black/6 bg-white/75 p-4">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">ATS 建议</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{result.atsTips.length}</p>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                          <button type="button" onClick={handleReset} className="flex-1 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                            重新分析
                          </button>
                          <ResultShareCard score={result.matchScore} riskLevel={result.riskLevel} summary={result.summary} toolName="resume" />
                        </div>
                      </div>
                    </div>
                  </motion.section>

                  <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12, duration: 0.45 }}
                      className="glass-panel rounded-[32px] p-6 text-[color:var(--ink)] sm:p-7"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">Action Queue</p>
                          <h3 className="mt-2 font-display text-2xl">优先修改清单</h3>
                        </div>
                        <p className="text-xs text-[color:var(--muted-ink)]">按影响度排序，建议从上往下处理</p>
                      </div>

                      <div className="mt-6 space-y-5">
                        {sortedIssues.map((issue, index) => {
                          const meta = severityMeta[issue.severity];
                          return (
                            <motion.article
                              key={`${issue.section}-${index}`}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.18 + index * 0.06, duration: 0.36 }}
                              className="relative overflow-hidden rounded-[26px] border border-white/45 bg-white/74 p-5"
                            >
                              <div className={clsx("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", meta.line)} />
                              <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-xs font-semibold text-[color:var(--ink)]">{index + 1}</span>
                                  <div>
                                    <p className="text-sm font-semibold text-[color:var(--ink)]">{issue.section}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className={clsx("h-2 w-2 rounded-full", meta.dot)} />
                                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">{meta.label}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className={clsx("rounded-full px-3 py-1 text-[11px] font-semibold", meta.badge)}>{meta.label}</span>
                              </div>

                              <div className="mt-4 grid gap-4 pl-2 lg:grid-cols-[0.9fr_1.1fr]">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-ink)]">问题</p>
                                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink)]">{issue.problem}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">建议动作</p>
                                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-ink)]">{issue.suggestion}</p>
                                </div>
                              </div>
                            </motion.article>
                          );
                        })}
                      </div>
                    </motion.section>

                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18, duration: 0.45 }}
                      className="glass-panel rounded-[32px] p-6 text-[color:var(--ink)] sm:p-7"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">Rewrite Studio</p>
                          <h3 className="mt-2 font-display text-2xl">逐段改写示例</h3>
                        </div>
                        <p className="text-xs text-[color:var(--muted-ink)]">保留事实，只改表达与岗位关联</p>
                      </div>

                      <div className="mt-6 space-y-4">
                        {result.rewrites.map((item, index) => (
                          <motion.article
                            key={`${item.original}-${index}`}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.06, duration: 0.36 }}
                            className="rounded-[28px] border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,250,255,0.75))] p-5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-ink)]">Rewrite {index + 1}</p>
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold text-sky-700">更贴近 JD</span>
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
                              <div className="rounded-[22px] bg-black/[0.035] p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-ink)]">Before</p>
                                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-ink)]">{item.original}</p>
                              </div>
                              <div className="flex items-center justify-center lg:min-h-[88px]">
                                <div className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">改写</div>
                              </div>
                              <div className="rounded-[22px] bg-sky-50/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">After</p>
                                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink)]">{item.optimized}</p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-[18px] border border-sky-100 bg-white/75 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-ink)]">为什么这样改</p>
                              <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-ink)]">{item.reason}</p>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    </motion.section>
                  </div>

                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24, duration: 0.45 }}
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                  >
                    <div className="glass-panel rounded-[28px] p-5 text-[color:var(--ink)]">
                      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">Keyword Gap</p>
                      <h3 className="mt-2 font-display text-xl">关键词缺口</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.missingKeywords.map((keyword) => (
                          <span key={keyword} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{keyword}</span>
                        ))}
                      </div>
                    </div>

                    <div className="glass-panel rounded-[28px] p-5 text-[color:var(--ink)]">
                      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">Existing Strengths</p>
                      <h3 className="mt-2 font-display text-xl">可保留优势</h3>
                      <ul className="mt-4 space-y-3">
                        {result.strengths.map((item, index) => (
                          <li key={`${item}-${index}`} className="flex items-start gap-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass-panel rounded-[28px] p-5 text-[color:var(--ink)]">
                      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">ATS Notes</p>
                      <h3 className="mt-2 font-display text-xl">机器筛选友好度</h3>
                      <ul className="mt-4 space-y-3">
                        {result.atsTips.map((item, index) => (
                          <li key={`${item}-${index}`} className="flex items-start gap-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass-panel rounded-[28px] p-5 text-[color:var(--ink)]">
                      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">Boundaries</p>
                      <h3 className="mt-2 font-display text-xl">事实边界提醒</h3>
                      <ul className="mt-4 space-y-3">
                        {result.cautions.map((item, index) => (
                          <li key={`${item}-${index}`} className="flex items-start gap-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.section>
                </>
              ) : streamedText ? (
                <div className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">分析结果（原始输出）</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--muted-ink)]">{streamedText}</p>
                  <p className="mt-3 text-xs text-amber-600">AI 返回格式异常，已显示原始内容供参考。</p>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
