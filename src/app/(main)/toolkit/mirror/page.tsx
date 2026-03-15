"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import InputModeSwitch from "@/components/toolkit/InputModeSwitch";
import TextInput from "@/components/toolkit/TextInput";
import ImageUploader from "@/components/toolkit/ImageUploader";
import TrafficLight from "@/components/toolkit/TrafficLight";
import TalkTranslationCard from "@/components/toolkit/TalkTranslation";
import AnalysisLoadingState from "@/components/toolkit/AnalysisLoadingState";
import ResultShareCard from "@/components/toolkit/ResultShareCard";
import { useToolkitStore } from "@/stores";
import { API_ROUTES } from "@/lib/constants";
import type { MirrorResult } from "@/types/toolkit";

const EXAMPLE_TEXTS = [
  {
    label: "试试这个假JD",
    text: `【高薪诚聘】市场推广专员 月入8000-15000\n\n工作内容：\n1. 负责公司产品的市场推广和客户开发\n2. 弹性工作制，时间自由安排\n3. 入职即购买五险（注：未提及一金）\n\n任职要求：\n- 年龄18-35岁，学历不限\n- 有无经验均可，公司提供免费培训（培训费用从工资中扣除）\n- 需缴纳1000元工装费/押金\n\n薪资待遇：\n- 底薪2000+高额提成，上不封顶\n- 试用期3个月工资打6折\n- 转正后签劳务派遣合同`,
  },
  {
    label: "聊天记录示例",
    text: `HR：你好，看了你的简历很不错，我们这边急招。\n求职者：请问薪资范围是多少？\nHR：薪资面议，看个人能力，优秀的话月入过万不是问题。\n求职者：有五险一金吗？\nHR：转正后有五险，一金要看公司效益。试用期6个月，工资打七折，这是行业惯例。\n求职者：试用期有点长吧？\nHR：我们公司比较正规，试用期长是为了更好地考察。另外入职前需要参加为期两周的培训，培训费3800，可以从工资里分期扣。`,
  },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function tryParseJSON(text: string): MirrorResult | null {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.riskLevel && typeof parsed.overallScore === "number") {
      return parsed as MirrorResult;
    }
    return null;
  } catch {
    return null;
  }
}

export default function MirrorPage() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [phase, setPhase] = useState<"input" | "analyzing" | "results">("input");
  const [error, setError] = useState<string | null>(null);

  const result = useToolkitStore((s) => s.currentMirrorResult);
  const setMirrorResult = useToolkitStore((s) => s.setMirrorResult);
  const addHistory = useToolkitStore((s) => s.addHistory);
  const history = useToolkitStore((s) => s.history);
  const router = useRouter();
  const searchParams = useSearchParams();
  const historyId = searchParams.get("historyId");
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit =
    mode === "text" ? text.length >= 20 : files.length > 0;

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    const newPreviews = await Promise.all(newFiles.map(fileToBase64));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    if (!historyId) return;
    const record = history.find(
      (item) => item.id === historyId && item.tool === "mirror"
    );
    const recordResult = (record as { result?: MirrorResult } | undefined)?.result;
    if (recordResult) {
      setMirrorResult(recordResult);
      setPhase("results");
      setStreamedText("");
      setError(null);
    } else {
      setMirrorResult(null);
      setPhase("input");
    }
  }, [historyId, history, setMirrorResult]);

  const handleSubmit = useCallback(async () => {
    if (historyId) {
      router.replace("/toolkit/mirror");
    }
    setError(null);
    setStreamedText("");
    setMirrorResult(null);
    setPhase("analyzing");

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 60_000);

    try {
      const bodyPayload =
        mode === "text"
          ? { mode: "text", text }
          : { mode: "image", imageBase64: previews[0] };

      const response = await fetch(API_ROUTES.TOOLKIT.MIRROR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
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
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Extract text content from the data stream
        const textContent = accumulated;

        setStreamedText(textContent);

        // Try to parse partial result to show traffic light early
        const partial = tryParseJSON(textContent);
        if (partial) {
          setMirrorResult(partial);
        }
      }

      // Final parse
      const finalResult = tryParseJSON(accumulated);
      if (finalResult) {
        setMirrorResult(finalResult);
        addHistory({
          id: crypto.randomUUID(),
          tool: "mirror",
          timestamp: Date.now(),
          inputPreview: mode === "text" ? text.slice(0, 100) : "[图片分析]",
          riskLevel: finalResult.riskLevel,
          score: finalResult.overallScore,
          summary: finalResult.summary,
          result: finalResult,
        });
        setPhase("results");
      } else {
        // Show raw text as fallback
        setPhase("results");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError("请求超时，请重试");
      } else {
        setError((err as Error).message || "分析失败，请重试");
      }
      setPhase("input");
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
    }
  }, [mode, text, previews, setMirrorResult, addHistory, historyId, router]);

  const handleReset = useCallback(() => {
    setPhase("input");
    setMirrorResult(null);
    setStreamedText("");
    setError(null);
    if (historyId) {
      router.replace("/toolkit/mirror");
    }
  }, [setMirrorResult, historyId, router]);

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

      <div className="relative mx-auto max-w-6xl px-4 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p
              className={clsx(
                "text-xs uppercase tracking-[0.32em]",
                phase === "input" ? "text-[color:var(--muted-ink)]" : "text-white/60"
              )}
            >
              Toolkit · Mirror
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">照妖镜</h1>
            <p
              className={clsx(
                "text-sm",
                phase === "input" ? "text-[color:var(--muted-ink)]" : "text-white/70"
              )}
            >
              粘贴 JD 或上传聊天截图，AI 帮你看清真实含义。
            </p>
          </div>
          <Link
            href="/toolkit"
            className={clsx(
              "text-xs font-semibold",
              phase === "input" ? "text-[color:var(--accent)]" : "text-white/70"
            )}
          >
            返回工具箱
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
              <div className="paper-card mx-auto max-w-2xl p-6 sm:p-8">
                <div className="mb-6">
                  <InputModeSwitch
                    mode={mode}
                    onModeChange={(m) => setMode(m as "text" | "image")}
                    options={[
                      { value: "text", label: "粘贴文本" },
                      { value: "image", label: "上传截图" },
                    ]}
                  />
                </div>

                {mode === "text" ? (
                  <TextInput value={text} onChange={setText} />
                ) : (
                  <ImageUploader
                    files={files}
                    previews={previews}
                    onFilesSelected={handleFilesSelected}
                    onRemove={handleRemoveFile}
                    maxFiles={1}
                    maxSizeMB={10}
                  />
                )}

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
                  开始照妖
                </button>

                {mode === "text" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {EXAMPLE_TEXTS.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        onClick={() => setText(example.text)}
                        className="rounded-full border border-[color:var(--paper-edge)] px-3 py-1.5 text-xs text-[color:var(--muted-ink)] transition hover:bg-white hover:text-[color:var(--ink)]"
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-10"
            >
              <AnalysisLoadingState />
              {streamedText && (
                <div className="mx-auto mt-6 max-w-2xl">
                  <div className="story-card rounded-2xl p-4 text-sm leading-relaxed text-[color:var(--ink)] opacity-60">
                    {streamedText.slice(0, 200)}...
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 space-y-8"
            >
              {/* Top hero: 分析结果 + 安全评分 — two-column */}
              <div className="grid gap-6 lg:grid-cols-[1fr_0.4fr]">
                {result && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                            风险评级
                          </p>
                          <h3 className="mt-2 font-display text-2xl">
                            分析结果
                          </h3>
                        </div>
                        <TrafficLight riskLevel={result.riskLevel} />
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                        {result.summary}
                      </p>
                    </motion.div>

                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="glass-panel rounded-3xl p-6 text-center text-[color:var(--ink)]"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                          安全评分
                        </p>
                        <p
                          className={clsx(
                            "mt-3 font-display text-5xl",
                            result.overallScore >= 70
                              ? "text-emerald-600"
                              : result.overallScore >= 30
                                ? "text-amber-600"
                                : "text-red-600"
                          )}
                        >
                          {result.overallScore}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--muted-ink)]">/ 100</p>
                      </motion.div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="flex-1 rounded-full bg-[color:var(--accent)] px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          重新分析
                        </button>
                        <ResultShareCard
                          score={result.overallScore}
                          riskLevel={result.riskLevel}
                          summary={result.summary}
                          toolName="mirror"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Detail sections below: 话术翻译 + 红旗警告 | 行动建议 */}
              {result && (
                <div className="grid gap-6 lg:grid-cols-[1fr_0.4fr]">
                  <div className="space-y-6">
                    {result.translations.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                          话术翻译
                        </p>
                        <h3 className="mt-2 font-display text-xl">
                          HR 说 → 实际意思
                        </h3>
                        <div className="mt-4 space-y-3">
                          {result.translations.map((item, index) => (
                            <TalkTranslationCard
                              key={index}
                              item={item}
                              index={index}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {result.redFlags.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                          红旗警告
                        </p>
                        <ul className="mt-3 space-y-2">
                          {result.redFlags.map((flag, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm text-[color:var(--ink)]"
                            >
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel self-start rounded-3xl p-6 text-[color:var(--ink)]"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                      行动建议
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                      {result.advice}
                    </p>
                  </motion.div>
                </div>
              )}

              {!result && streamedText && (
                <div className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                    分析结果（原始输出）
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--muted-ink)]">
                    {streamedText}
                  </p>
                  <p className="mt-3 text-xs text-amber-600">
                    AI 返回格式异常，已显示原始内容供参考。
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
