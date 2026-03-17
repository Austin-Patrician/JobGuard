"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { getLevel1Scripts } from "@/data/scripts";
import type { JDScript } from "@/types/game";
import { useGameStore } from "@/stores";
import { GAME_CONFIG } from "@/lib/constants";

type SentenceChunk = {
  id: string;
  text: string;
  scriptId: string;
  trapIds: string[];
  isBreak?: boolean;
  isTrapChunk?: boolean;
};

type ReviewResult = {
  correct: number;
  wrong: number;
  missed: number;
  total: number;
  score: number;
  rating: string;
};

function buildSentenceChunks(script: JDScript): SentenceChunk[] {
  const text = script.fullText;
  const traps = script.traps.map((trap) => {
    const trapId = `${script.id}-trap-${trap.id}`;
    const occurrences: number[] = [];
    let cursor = text.indexOf(trap.text);
    while (cursor !== -1) {
      occurrences.push(cursor);
      cursor = text.indexOf(trap.text, cursor + 1);
    }
    let start = trap.startIndex ?? -1;
    if (occurrences.length > 0) {
      const target = typeof trap.startIndex === "number" ? trap.startIndex : occurrences[0];
      start = occurrences.reduce((best, value) =>
        Math.abs(value - target) < Math.abs(best - target) ? value : best
      );
    }
    if (start < 0 || start > text.length) {
      start = Math.max(0, Math.min(text.length, trap.startIndex ?? 0));
    }
    const end =
      occurrences.length > 0
        ? start + trap.text.length
        : Math.max(start, Math.min(text.length, trap.endIndex ?? start));
    return {
      id: trapId,
      text: trap.text,
      startIndex: start,
      endIndex: end,
    };
  });
  const sentenceRanges: Array<{ text: string; start: number; end: number }> = [];
  const sentenceEnd = new Set(["。", "！", "？", "；"]);
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\n") {
      if (i > start) {
        sentenceRanges.push({ text: text.slice(start, i), start, end: i });
      }
      sentenceRanges.push({ text: "\n", start: i, end: i + 1 });
      start = i + 1;
      continue;
    }
    if (sentenceEnd.has(char)) {
      const end = i + 1;
      sentenceRanges.push({ text: text.slice(start, end), start, end });
      start = end;
    }
  }

  if (start < text.length) {
    sentenceRanges.push({ text: text.slice(start), start, end: text.length });
  }

  const sentenceChunks = sentenceRanges.map((chunk, index) => {
    if (chunk.text === "\n") {
      return {
        id: `${script.id}-br-${index}`,
        text: "\n",
        scriptId: script.id,
        trapIds: [],
        isBreak: true as const,
      };
    }
    const trapIds = traps
      .filter((trap) => trap.startIndex < chunk.end && trap.endIndex > chunk.start)
      .map((trap) => trap.id);
    return {
      id: `${script.id}-sentence-${index}`,
      text: chunk.text,
      scriptId: script.id,
      trapIds,
      isBreak: false as const,
    };
  });

  return sentenceChunks.flatMap((chunk, index) => {
    if (chunk.isBreak) return [chunk];
    if (chunk.trapIds.length === 0) return [chunk];

    const raw = chunk.text;
    const offset = sentenceRanges[index].start;
    const innerTraps = traps
      .filter((trap) => trap.startIndex >= offset && trap.endIndex <= sentenceRanges[index].end)
      .sort((a, b) => a.startIndex - b.startIndex);
    if (innerTraps.length === 0) return [chunk];

    const splitParts: SentenceChunk[] = [];
    let cursor = 0;
    innerTraps.forEach((trap) => {
      const localStart = trap.startIndex - offset;
      const localEnd = trap.endIndex - offset;
      if (localStart > cursor) {
        splitParts.push({
          id: `${chunk.id}-text-${cursor}`,
          text: raw.slice(cursor, localStart),
          scriptId: script.id,
          trapIds: [],
        });
      }
      splitParts.push({
        id: `${chunk.id}-trap-${trap.id}`,
        text: raw.slice(localStart, localEnd),
        scriptId: script.id,
        trapIds: [trap.id],
        isTrapChunk: true,
      });
      cursor = localEnd;
    });
    if (cursor < raw.length) {
      splitParts.push({
        id: `${chunk.id}-text-${cursor}`,
        text: raw.slice(cursor),
        scriptId: script.id,
        trapIds: [],
      });
    }

    return splitParts;
  });
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function Typewriter({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return <span>{displayed}</span>;
}

export default function GoldenEyePage() {
  const [selectedTraps, setSelectedTraps] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedWrongs, setSelectedWrongs] = useState<Set<string>>(
    () => new Set()
  );
  const [impact, setImpact] = useState(false);
  const [showObjection, setShowObjection] = useState(false);
  const [reviewByScript, setReviewByScript] = useState<Record<string, ReviewResult>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  const hp = useGameStore((state) => state.hp);
  const exp = useGameStore((state) => state.exp);
  const adjustHp = useGameStore((state) => state.adjustHp);
  const adjustExp = useGameStore((state) => state.adjustExp);
  const completeLevel = useGameStore((state) => state.completeLevel);
  const setCurrentLevel = useGameStore((state) => state.setCurrentLevel);
  const getRating = useGameStore((state) => state.getRating);

  const scripts = useMemo(() => {
    const all = getLevel1Scripts();
    return [...all].sort(() => Math.random() - 0.5).slice(0, 3);
  }, []);

  const segmentsByScript = useMemo(
    () =>
      scripts.map((script) => ({
        script,
        chunks: buildSentenceChunks(script),
      })),
    [scripts]
  );

  const minHpFloor = 20;
  const wrongPenalty = Math.max(GAME_CONFIG.LEVEL1.HP_PENALTY_WRONG, -6);

  const getScriptStats = useCallback(
    (script: JDScript | undefined) => {
      if (!script) {
        return { correct: 0, wrong: 0, total: 0, missed: 0 };
      }
      const trapIds = new Set(
        script.traps.map((trap) => `${script.id}-trap-${trap.id}`)
      );
      let correct = 0;
      selectedTraps.forEach((id) => {
        if (!id.startsWith(`${script.id}-trap-`)) return;
        if (trapIds.has(id)) correct += 1;
      });
      let wrong = 0;
      selectedWrongs.forEach((id) => {
        if (id.startsWith(`${script.id}-sentence-`)) wrong += 1;
      });
      const total = trapIds.size;
      return { correct, wrong, total, missed: Math.max(0, total - correct) };
    },
    [selectedTraps, selectedWrongs]
  );

  const handleSubmit = useCallback(() => {
    const script = scripts[activeIndex];
    if (!script) return;
    const stats = getScriptStats(script);
    const score = Math.max(
      0,
      stats.correct * GAME_CONFIG.LEVEL1.SCORE.CORRECT +
        stats.wrong * GAME_CONFIG.LEVEL1.SCORE.WRONG +
        stats.missed * GAME_CONFIG.LEVEL1.SCORE.MISSED
    );
    const rating = getRating(score);
    const result: ReviewResult = {
      correct: stats.correct,
      wrong: stats.wrong,
      missed: stats.missed,
      total: stats.total,
      score,
      rating,
    };
    setReviewByScript((prev) => ({ ...prev, [script.id]: result }));

    const nextResults = { ...reviewByScript, [script.id]: result };
    const totalScore = Object.values(nextResults).reduce(
      (sum, item) => sum + item.score,
      0
    );
    if (Object.keys(nextResults).length === scripts.length) {
      completeLevel("golden-eye", totalScore);
    }

    if (stats.correct >= GAME_CONFIG.LEVEL1.OBJECTION_THRESHOLD) {
      setShowObjection(true);
      window.setTimeout(() => setShowObjection(false), 1300);
    }
  }, [activeIndex, completeLevel, getRating, getScriptStats, reviewByScript, scripts]);

  useEffect(() => {
    setCurrentLevel("golden-eye");
  }, [setCurrentLevel]);

  const triggerImpact = useCallback(() => {
    setImpact(true);
    window.setTimeout(() => setImpact(false), 350);
  }, []);

  const toggleSelection = useCallback(
    (chunk: SentenceChunk) => {
      if (chunk.trapIds.length > 0) {
        const trapId = chunk.trapIds[0];
        setSelectedTraps((prev) => {
          const next = new Set(prev);
          const alreadySelected = next.has(trapId);
          if (alreadySelected) {
            next.delete(trapId);
            return next;
          }
          next.add(trapId);
          adjustExp(GAME_CONFIG.LEVEL1.EXP_PER_CORRECT);
          return next;
        });
        return;
      }

      setSelectedWrongs((prev) => {
        const next = new Set(prev);
        const alreadySelected = next.has(chunk.id);
        if (alreadySelected) {
          next.delete(chunk.id);
          return next;
        }
        next.add(chunk.id);
        const nextHp = Math.max(minHpFloor, hp + wrongPenalty);
        adjustHp(nextHp - hp);
        triggerImpact();
        return next;
      });
    },
    [adjustExp, adjustHp, hp, minHpFloor, triggerImpact, wrongPenalty]
  );

  const activeScript = segmentsByScript[activeIndex]?.script;
  const activeSegments = segmentsByScript[activeIndex]?.chunks ?? [];
  const activeStats = useMemo(
    () => getScriptStats(activeScript),
    [activeScript, getScriptStats]
  );
  const currentReview = activeScript ? reviewByScript[activeScript.id] : undefined;
  const showReview = Boolean(currentReview);
  const mentorSummary = currentReview
    ? `你识破了 ${currentReview.correct}/${currentReview.total} 处“坑点”。漏掉 ${currentReview.missed} 处，误判 ${currentReview.wrong} 处。`
    : "点击你认为有猫腻的词句，系统会以“扫描”方式标记风险点。";

  return (
    <div className={clsx("min-h-screen night-surface text-white", impact && "impact-shake")}>
      <div className="pointer-events-none absolute inset-0 grain-overlay opacity-40" />
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 opacity-0 bg-[radial-gradient(circle_at_center,rgba(179,43,43,0.35),transparent_70%)]",
          impact && "impact-flash"
        )}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <header className="flex flex-col gap-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">
              Level 1 · Golden Eye
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">
              黄金眼：虚假 JD 识别
            </h1>
            <p className="text-sm sm:text-base text-white/70">
              深夜求职模式：在真实岗位详情里找出话术陷阱。
            </p>
          </div>
        <div className="glass-panel rounded-3xl px-5 py-4 text-[color:var(--ink)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[140px]">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                  HP
                </p>
                <div className="mt-2 h-2 rounded-full bg-black/10">
                  <div
                    className="h-2 rounded-full bg-[color:var(--accent)]"
                    style={{ width: `${(hp / GAME_CONFIG.MAX_HP) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--muted-ink)]">
                  {hp}/{GAME_CONFIG.MAX_HP}
                </p>
              </div>
              <div className="min-w-[120px]">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                  EXP
                </p>
                <div className="mt-2 h-2 rounded-full bg-black/10">
                  <div
                    className="h-2 rounded-full bg-[color:var(--success)]"
                    style={{ width: `${Math.min(exp, 100) * 0.8}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--muted-ink)]">
                  {exp} pts
                </p>
              </div>
              <div className="min-w-[120px]">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                  Progress
                </p>
                <p className="mt-2 text-xl font-display">
                  {activeStats.correct}/{activeStats.total}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-ink)]">
                  已识别
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {segmentsByScript.map(({ script }, index) => (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={clsx(
                      "rounded-full px-4 py-1 text-[11px] font-semibold transition",
                      index === activeIndex
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-white/70 text-[color:var(--muted-ink)]"
                    )}
                  >
                    {script.company}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/game"
                  className="text-xs font-semibold text-[color:var(--accent)]"
                >
                  返回大厅
                </Link>
                <button
                  type="button"
                  className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-[11px] font-semibold text-white"
                  onClick={handleSubmit}
                >
                  {currentReview ? "刷新复盘" : "提交复盘"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div
          className={clsx(
            "mt-8 gap-8",
            showReview ? "grid lg:grid-cols-[420px_1fr] lg:items-start" : "flex justify-center"
          )}
        >
          <div className={clsx("w-full", showReview ? "" : "max-w-[420px]")}>
            <div className="phone-shell">
              <div className="phone-screen text-[#1b2333]">
                <div className="phone-status">
                  <span>23:30</span>
                  <div className="flex items-center gap-1">
                    <div className="flex items-end gap-[2px]">
                      <span className="h-2 w-0.5 rounded bg-[#1b2333]" />
                      <span className="h-2.5 w-0.5 rounded bg-[#1b2333]/80" />
                      <span className="h-3 w-0.5 rounded bg-[#1b2333]/70" />
                      <span className="h-3.5 w-0.5 rounded bg-[#1b2333]/55" />
                    </div>
                    <div className="ml-1 h-3 w-4 rounded-sm border border-[#1b2333]/80 p-[1px]">
                      <div className="h-full w-[70%] rounded-sm bg-[#1b2333]" />
                    </div>
                    <span className="ml-1 h-2 w-2 rounded-full border border-[#1b2333]/80" />
                  </div>
                </div>
                <div className="boss-divider" />

                <div className="flex items-center justify-between px-4 py-3">
                  <button type="button" className="text-sm font-semibold text-[#5c6b7d]">
                    ‹ 返回
                  </button>
                  <span className="text-sm font-semibold text-[#1f2a37]">
                    岗位详情
                  </span>
                  <button type="button" className="text-sm font-semibold text-[#5c6b7d]">
                    ☆
                  </button>
                </div>

                <div className="boss-divider" />

                <div className="max-h-[70vh] min-h-[560px] overflow-y-auto pb-20">
                  <div className="px-4 pt-4">
                    <h2 className="boss-hero-title">
                      {activeScript?.position}
                    </h2>
                    <p className="mt-1 boss-hero-salary">
                      {activeScript?.salary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 boss-secondary">
                      <span>上海 · 浦东新区 · 世纪公园</span>
                      <span>· 3-5年</span>
                      <span>· 本科</span>
                    </div>
                  </div>

                  <div className="boss-divider mt-4" />

                  <div className="px-4 py-4">
                    <div className="boss-card flex items-center gap-3 px-3 py-3">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#cfe2f1] to-[#8aa2c5]" />
                      <div>
                        <p className="text-sm font-semibold text-[#1f2a37]">
                          陈女士 · 招聘经理
                        </p>
                        <p className="text-xs boss-muted">上海地区 · 14分钟前回复</p>
                      </div>
                    </div>
                  </div>

                  <div className="boss-divider" />

                  <div className="px-4 py-4">
                    <p className="boss-section-title">职位标签</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["C#", "C++", ".NET", "ADO.NET", "ASP.NET", "企业级开发"].map(
                        (tag) => (
                          <span key={tag} className="boss-chip">
                            {tag}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="boss-divider" />

                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <p className="boss-section-title">职位描述</p>
                      <span className="boss-chip-green">点击可疑话术</span>
                    </div>
                    <div className="mt-3 text-[13px] leading-6 boss-muted">
                      {activeSegments.map((chunk) => {
                        if (chunk.isBreak) {
                          return <br key={chunk.id} />;
                        }
                        const isReview = showReview;
                        const hasTrap = chunk.trapIds.length > 0;
                        const trapSelected = hasTrap
                          ? selectedTraps.has(chunk.trapIds[0])
                          : false;
                        const wrongSelected = selectedWrongs.has(chunk.id);

                        const baseClasses =
                          "boss-touch transition-colors duration-150";
                        const playingClasses = hasTrap
                          ? trapSelected
                            ? "bg-emerald-200/70 text-emerald-900"
                            : "hover:bg-[#e7eef6]"
                          : wrongSelected
                            ? "bg-amber-200/70 text-amber-900"
                            : "hover:bg-[#f3f6fa]";
                        const reviewClasses = hasTrap
                          ? trapSelected
                            ? "bg-emerald-200/80 text-emerald-900 ring-1 ring-emerald-400/60"
                            : "bg-rose-200/80 text-rose-900 ring-1 ring-rose-400/60"
                          : wrongSelected
                            ? "bg-amber-200/80 text-amber-900 line-through"
                            : "text-[#7b8794]";

                        const className = clsx(
                          baseClasses,
                          isReview ? reviewClasses : playingClasses,
                          "cursor-pointer select-none"
                        );

                        return (
                          <span
                            key={chunk.id}
                            className={className}
                            onClick={() => toggleSelection(chunk)}
                          >
                            {chunk.text}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="boss-divider" />

                  <div className="px-4 py-4">
                    <p className="boss-section-title">公司信息</p>
                    <div className="mt-2 text-sm boss-muted">
                      {activeScript?.company} · 100-499人 · 人力资源服务
                    </div>
                    <div className="mt-3 h-32 rounded-xl bg-gradient-to-br from-[#dce9f5] to-[#b8c8dc]"></div>
                  </div>

                  <div className="boss-divider" />

                  <div className="px-4 py-4">
                    <p className="boss-section-title">BOSS安全提示</p>
                    <p className="mt-2 text-sm leading-relaxed boss-muted">
                      本平台不会以任何名义要求求职者缴纳费用或提供银行卡信息。若发现异常，请立即举报。
                    </p>
                  </div>
                </div>

                <div className="boss-divider" />
                <div className="px-4 py-3">
                  <div className="boss-button">立即沟通</div>
                </div>
              </div>
            </div>
          </div>

          {showReview && (
            <aside className="space-y-4">
              <div className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                  当前岗位复盘
                </p>
                <h3 className="mt-3 font-display text-2xl">
                  {activeScript?.company}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--muted-ink)]">
                  {activeScript?.position} · {activeScript?.salary}
                </p>
                {currentReview && (
                  <div className="mt-4 flex items-center gap-4 text-xs text-[color:var(--muted-ink)]">
                    <span>识破 {currentReview.correct}</span>
                    <span>漏掉 {currentReview.missed}</span>
                    <span>误判 {currentReview.wrong}</span>
                    <span>评分 {currentReview.rating}</span>
                  </div>
                )}
                <div className="mt-5 space-y-3 text-sm text-[color:var(--muted-ink)]">
                  {activeScript?.traps.map((trap) => {
                    const trapSegmentId = `${activeScript.id}-trap-${trap.id}`;
                    const hit = selectedTraps.has(trapSegmentId);
                    return (
                      <div
                        key={trap.id}
                        className={clsx(
                          "rounded-2xl border px-4 py-3 text-sm",
                          hit
                            ? "border-emerald-300 bg-emerald-100/70 text-emerald-900"
                            : "border-rose-300 bg-rose-100/70 text-rose-900"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{trap.text}</p>
                          <span className="text-[11px] uppercase tracking-[0.2em] opacity-70">
                            {hit ? "命中" : "遗漏"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs opacity-80">{trap.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* <div className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                  AI 导师
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                  <Typewriter text={mentorSummary} />
                </p>
              </div> */}
            </aside>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showObjection && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative flex h-[360px] w-[360px] items-center justify-center">
              <motion.div
                className="absolute left-10 top-8 h-5 w-5 rounded-full bg-[#ffd1dc] shadow-[0_0_12px_rgba(255,209,220,0.6)]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8], y: [-6, -14, -10] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <motion.div
                className="absolute right-12 top-12 h-4 w-4 rounded-full bg-[#ffe4b5] shadow-[0_0_12px_rgba(255,228,181,0.6)]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.1, 1], opacity: [0, 1, 0.7], y: [-4, -12, -8] }}
                transition={{ duration: 0.85, ease: "easeOut", delay: 0.1 }}
              />
              <motion.div
                className="absolute left-14 bottom-12 h-4.5 w-4.5 rounded-full bg-[#ffd6a5] shadow-[0_0_12px_rgba(255,214,165,0.6)]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 0.8], y: [6, -4, 0] }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              />

              <motion.div
                className="relative flex h-[230px] w-[230px] items-center justify-center rounded-[60px] bg-[radial-gradient(circle_at_top,#ffe7ef,#ffd1dc_55%,#ffc1d4)] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]"
                initial={{ scale: 0.7, rotate: -6, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
              >
                <motion.div
                  className="absolute -top-4 right-6 rounded-full bg-white px-4 py-1 text-[11px] font-semibold text-[#ff7fa6] shadow-[0_8px_14px_rgba(255,127,166,0.25)]"
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  NEW!
                </motion.div>
                <div className="absolute top-16 flex w-full items-center justify-center gap-8">
                  <div className="relative h-5 w-5 rounded-full bg-[#1b2333]">
                    <motion.div
                      className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white"
                      animate={{ y: [0, 2, 0] }}
                      transition={{ duration: 1.2, repeat: 1, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="relative h-5 w-5 rounded-full bg-[#1b2333]">
                    <motion.div
                      className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white"
                      animate={{ y: [0, 2, 0] }}
                      transition={{ duration: 1.2, repeat: 1, ease: "easeInOut", delay: 0.1 }}
                    />
                  </div>
                </div>
                <div className="absolute top-24 flex w-full items-center justify-center gap-12">
                  <div className="h-3 w-5 rounded-full bg-[#ff9db8]/70" />
                  <div className="h-3 w-5 rounded-full bg-[#ff9db8]/70" />
                </div>
                <motion.div
                  className="absolute bottom-16 h-3.5 w-12 rounded-full bg-[#ff7fa6]/40"
                  animate={{ scaleX: [0.8, 1, 0.85] }}
                  transition={{ duration: 0.8, repeat: 1, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -left-5 bottom-14 h-7 w-7 rounded-full bg-[#ffd1dc]"
                  animate={{ rotate: [0, -10, 0], y: [0, -4, 0] }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute -right-5 bottom-14 h-7 w-7 rounded-full bg-[#ffd1dc]"
                  animate={{ rotate: [0, 10, 0], y: [0, -4, 0] }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </motion.div>

              <motion.div
                className="absolute bottom-1 text-center text-white"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <p className="text-xs tracking-[0.3em] text-white/70">叮！</p>
                <p className="mt-2 font-display text-3xl">抓到一个小坑</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence />
    </div>
  );
}
