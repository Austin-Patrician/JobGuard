"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import InputModeSwitch from "@/components/toolkit/InputModeSwitch";
import TextInput from "@/components/toolkit/TextInput";
import ImageUploader from "@/components/toolkit/ImageUploader";
import TrafficLight from "@/components/toolkit/TrafficLight";
import RiskSummaryTable from "@/components/toolkit/RiskSummaryTable";
import AnalysisLoadingState from "@/components/toolkit/AnalysisLoadingState";
import ResultShareCard from "@/components/toolkit/ResultShareCard";
import { useToolkitStore } from "@/stores";
import { API_ROUTES } from "@/lib/constants";
import type { ContractResult } from "@/types/toolkit";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function tryParseJSON(text: string): ContractResult | null {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.riskLevel && typeof parsed.overallScore === "number" && Array.isArray(parsed.riskItems)) {
      return parsed as ContractResult;
    }
    return null;
  } catch {
    return null;
  }
}

const salaryClarityLabels = {
  clear: "明确",
  vague: "模糊",
  missing: "缺失",
};

const salaryClarityColors = {
  clear: "bg-emerald-100 text-emerald-700",
  vague: "bg-amber-100 text-amber-700",
  missing: "bg-red-100 text-red-700",
};

export default function ContractPage() {
  const [mode, setMode] = useState<"text" | "images">("images");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [phase, setPhase] = useState<"input" | "analyzing" | "results">("input");
  const [error, setError] = useState<string | null>(null);

  const result = useToolkitStore((s) => s.currentContractResult);
  const setContractResult = useToolkitStore((s) => s.setContractResult);
  const addHistory = useToolkitStore((s) => s.addHistory);
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

  const handleSubmit = useCallback(async () => {
    setError(null);
    setStreamedText("");
    setContractResult(null);
    setPhase("analyzing");

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 60_000);

    try {
      const bodyPayload =
        mode === "text"
          ? { mode: "text", text }
          : { mode: "images", imagesBase64: previews };

      const response = await fetch(API_ROUTES.TOOLKIT.CONTRACT, {
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

        const textContent = accumulated;

        setStreamedText(textContent);

        const partial = tryParseJSON(textContent);
        if (partial) {
          setContractResult(partial);
        }
      }

      const finalResult = tryParseJSON(accumulated);
      if (finalResult) {
        setContractResult(finalResult);
        addHistory({
          id: crypto.randomUUID(),
          tool: "contract",
          timestamp: Date.now(),
          inputPreview: mode === "text" ? text.slice(0, 100) : `[${files.length}页合同图片]`,
          riskLevel: finalResult.riskLevel,
          score: finalResult.overallScore,
          summary: finalResult.legalAdvice,
        });
        setPhase("results");
      } else {
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
  }, [mode, text, previews, files.length, setContractResult, addHistory]);

  const handleReset = useCallback(() => {
    setPhase("input");
    setContractResult(null);
    setStreamedText("");
    setError(null);
  }, [setContractResult]);

  const highCount = result?.riskItems.filter((i) => i.severity === "high").length ?? 0;
  const mediumCount = result?.riskItems.filter((i) => i.severity === "medium").length ?? 0;

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
              Toolkit · Contract
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">合同避雷针</h1>
            <p
              className={clsx(
                "text-sm",
                phase === "input" ? "text-[color:var(--muted-ink)]" : "text-white/70"
              )}
            >
              上传合同照片或粘贴条款文本，AI 逐条体检。
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
                    onModeChange={(m) => setMode(m as "text" | "images")}
                    options={[
                      { value: "images", label: "上传合同照片" },
                      { value: "text", label: "粘贴条款文本" },
                    ]}
                  />
                </div>

                {mode === "images" ? (
                  <ImageUploader
                    files={files}
                    previews={previews}
                    onFilesSelected={handleFilesSelected}
                    onRemove={handleRemoveFile}
                    maxFiles={10}
                    maxSizeMB={20}
                    accept={{
                      "image/png": [],
                      "image/jpeg": [],
                      "image/webp": [],
                    }}
                  />
                ) : (
                  <TextInput
                    value={text}
                    onChange={setText}
                    placeholder="粘贴劳动合同的条款内容..."
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
                      ? "bg-amber-500 text-white hover:opacity-90"
                      : "bg-black/10 text-[color:var(--muted-ink)] cursor-not-allowed"
                  )}
                >
                  开始体检
                </button>
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
              <AnalysisLoadingState
                text="AI 正在逐条分析合同..."
                progress={
                  files.length > 1
                    ? `正在分析 ${files.length} 页合同内容`
                    : undefined
                }
              />
            </motion.div>
          )}

          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.6fr]"
            >
              <div className="space-y-6">
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
                            合同体检报告
                          </p>
                          <h3 className="mt-2 font-display text-2xl">
                            风险评级
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={clsx(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                              salaryClarityColors[result.salaryClarity]
                            )}
                          >
                            薪资{salaryClarityLabels[result.salaryClarity]}
                          </span>
                          <TrafficLight riskLevel={result.riskLevel} />
                        </div>
                      </div>
                    </motion.div>

                    {result.riskItems.length > 0 && (
                      <div className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]">
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                          风险条款
                        </p>
                        <h3 className="mt-2 font-display text-xl">
                          逐条分析 ({result.riskItems.length} 项)
                        </h3>
                        <div className="mt-4">
                          <RiskSummaryTable items={result.riskItems} />
                        </div>
                      </div>
                    )}
                  </>
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
              </div>

              <div className="space-y-4">
                {result && (
                  <>
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

                      <div className="mt-4 flex justify-center gap-4 text-xs text-[color:var(--muted-ink)]">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          {highCount} 处高危
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          {mediumCount} 处警告
                        </span>
                      </div>
                    </motion.div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                      >
                        重新分析
                      </button>
                      <ResultShareCard
                        score={result.overallScore}
                        riskLevel={result.riskLevel}
                        summary={result.legalAdvice}
                        toolName="contract"
                      />
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                        综合法律建议
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                        {result.legalAdvice}
                      </p>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
