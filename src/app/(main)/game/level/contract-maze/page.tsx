"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { getLevel3Script } from "@/data/scripts";
import type { ContractScript, ContractClause } from "@/types/game";
import { useGameStore } from "@/stores";
import { GAME_CONFIG } from "@/lib/constants";
import { PixiContractScene } from "@/components/game/PixiContractScene";

// --- Types ---

type ContractSegment = {
  id: string;
  text: string;
  clauseId: string | null;
  severity: "critical" | "warning" | null;
  isBreak?: boolean;
  isSectionTitle?: boolean;
};

// --- Helpers ---

function buildContractSegments(script: ContractScript): ContractSegment[] {
  const text = script.fullText;

  // Resolve clause positions by finding actual text occurrences
  const clauses = script.clauses
    .filter((c) => c.isTrap)
    .map((clause) => {
      const occurrences: number[] = [];
      let cursor = text.indexOf(clause.text);
      while (cursor !== -1) {
        occurrences.push(cursor);
        cursor = text.indexOf(clause.text, cursor + 1);
      }
      let start = clause.startIndex ?? 0;
      if (occurrences.length > 0) {
        start = occurrences.reduce((best, val) =>
          Math.abs(val - (clause.startIndex ?? 0)) <
          Math.abs(best - (clause.startIndex ?? 0))
            ? val
            : best
        );
      }
      return {
        id: clause.id,
        text: clause.text,
        severity: clause.severity as "critical" | "warning",
        start,
        end: start + clause.text.length,
      };
    });

  // Build sentence ranges by splitting on newlines and sentence-ending punctuation
  const ranges: Array<{ text: string; start: number; end: number }> = [];
  const sentenceEnd = new Set(["。", "！", "？", "；"]);
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      if (i > start) ranges.push({ text: text.slice(start, i), start, end: i });
      ranges.push({ text: "\n", start: i, end: i + 1 });
      start = i + 1;
      continue;
    }
    if (sentenceEnd.has(text[i])) {
      const end = i + 1;
      ranges.push({ text: text.slice(start, end), start, end });
      start = end;
    }
  }
  if (start < text.length) {
    ranges.push({ text: text.slice(start), start, end: text.length });
  }

  // Map ranges to segments, splitting at clause boundaries
  return ranges.flatMap((range, index) => {
    if (range.text === "\n") {
      return [
        {
          id: `br-${index}`,
          text: "\n",
          clauseId: null,
          severity: null,
          isBreak: true,
        },
      ];
    }

    const isSectionTitle = /^第[一二三四五六七八九十]+条\s/.test(range.text);
    const overlapping = clauses
      .filter((c) => c.start < range.end && c.end > range.start)
      .sort((a, b) => a.start - b.start);

    if (overlapping.length === 0) {
      return [
        {
          id: `seg-${index}`,
          text: range.text,
          clauseId: null,
          severity: null,
          isSectionTitle,
        },
      ];
    }

    // Split at clause boundaries
    const parts: ContractSegment[] = [];
    let cursor = range.start;
    overlapping.forEach((clause, ci) => {
      const cStart = Math.max(clause.start, range.start);
      const cEnd = Math.min(clause.end, range.end);
      if (cStart > cursor) {
        parts.push({
          id: `seg-${index}-pre-${ci}`,
          text: text.slice(cursor, cStart),
          clauseId: null,
          severity: null,
        });
      }
      parts.push({
        id: `seg-${index}-clause-${clause.id}`,
        text: text.slice(cStart, cEnd),
        clauseId: clause.id,
        severity: clause.severity,
      });
      cursor = cEnd;
    });
    if (cursor < range.end) {
      parts.push({
        id: `seg-${index}-post`,
        text: text.slice(cursor, range.end),
        clauseId: null,
        severity: null,
      });
    }
    return parts;
  });
}

// --- Main Component ---

export default function ContractMazePage() {
  const script = useMemo(() => getLevel3Script(), []);
  const segments = useMemo(() => buildContractSegments(script), [script]);
  const trapClauses = useMemo(
    () => script.clauses.filter((c) => c.isTrap),
    [script]
  );

  // State
  const [foundClauses, setFoundClauses] = useState<
    Map<string, "player" | "magnifier">
  >(() => new Map());
  const [falsePositives, setFalsePositives] = useState(0);
  const [magnifierUsed, setMagnifierUsed] = useState(0);
  const [impact, setImpact] = useState(false);
  const [showObjection, setShowObjection] = useState(false);
  const [gamePhase, setGamePhase] = useState<"intro" | "playing" | "review">(
    "intro"
  );
  const [selectedClauseDetail, setSelectedClauseDetail] =
    useState<ContractClause | null>(null);
  const [scanSignal, setScanSignal] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanRevealId, setScanRevealId] = useState<string | null>(null);
  const [showFinalStamp, setShowFinalStamp] = useState(false);
  const [showShred, setShowShred] = useState(false);

  const correctCountRef = useRef(0);
  const contractBodyRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const hp = useGameStore((s) => s.hp);
  const exp = useGameStore((s) => s.exp);
  const adjustHp = useGameStore((s) => s.adjustHp);
  const adjustExp = useGameStore((s) => s.adjustExp);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const setCurrentLevel = useGameStore((s) => s.setCurrentLevel);
  const getRating = useGameStore((s) => s.getRating);

  const L3 = GAME_CONFIG.LEVEL3;

  useEffect(() => {
    setCurrentLevel("contract-maze");
  }, [setCurrentLevel]);

  // --- Callbacks ---

  const triggerImpact = useCallback(() => {
    setImpact(true);
    window.setTimeout(() => setImpact(false), 350);
  }, []);

  const handleSegmentClick = useCallback(
    (segment: ContractSegment) => {
      if (gamePhase !== "playing" || scanning) return;

      if (segment.clauseId) {
        // Correct trap found
        if (foundClauses.has(segment.clauseId)) return;
        const clause = trapClauses.find((c) => c.id === segment.clauseId);
        if (!clause) return;

        setFoundClauses((prev) => {
          const next = new Map(prev);
          next.set(segment.clauseId!, "player");
          return next;
        });

        const expGain =
          segment.severity === "critical"
            ? L3.EXP_PER_CRITICAL
            : L3.EXP_PER_WARNING;
        adjustExp(expGain);
        setSelectedClauseDetail(clause);

        correctCountRef.current += 1;
        if (correctCountRef.current % L3.OBJECTION_THRESHOLD === 0) {
          setShowObjection(true);
          window.setTimeout(() => setShowObjection(false), 1500);
        }
      } else {
        // False positive
        setFalsePositives((prev) => prev + 1);
        adjustHp(L3.HP_PENALTY_WRONG);
        triggerImpact();
      }
    },
    [gamePhase, scanning, foundClauses, trapClauses, adjustExp, adjustHp, triggerImpact, L3]
  );

  const handleMagnifier = useCallback(() => {
    if (
      magnifierUsed >= L3.MAGNIFIER_USES ||
      scanning ||
      gamePhase !== "playing"
    )
      return;

    const unfound = trapClauses.filter((c) => !foundClauses.has(c.id));
    if (unfound.length === 0) return;

    const target = unfound[Math.floor(Math.random() * unfound.length)];
    setScanning(true);
    setMagnifierUsed((prev) => prev + 1);
    setScanSignal((prev) => prev + 1);
    setScanRevealId(target.id);

    window.setTimeout(() => {
      setFoundClauses((prev) => {
        const next = new Map(prev);
        next.set(target.id, "magnifier");
        return next;
      });
      setSelectedClauseDetail(target);
      setScanning(false);
      setScanRevealId(null);

      const el = document.getElementById(`clause-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, L3.SCAN_DURATION_MS);
  }, [magnifierUsed, scanning, gamePhase, trapClauses, foundClauses, L3]);

  const calculateScore = useCallback(() => {
    let score = 0;
    foundClauses.forEach((method, clauseId) => {
      const clause = trapClauses.find((c) => c.id === clauseId);
      if (!clause) return;
      if (method === "magnifier") {
        score += L3.SCORE.MAGNIFIER_FOUND;
      } else if (clause.severity === "critical") {
        score += L3.SCORE.CRITICAL_FOUND;
      } else {
        score += L3.SCORE.WARNING_FOUND;
      }
    });
    score += falsePositives * L3.SCORE.FALSE_POSITIVE;
    return Math.max(0, Math.min(100, score));
  }, [foundClauses, falsePositives, trapClauses, L3]);

  const handleSubmitReview = useCallback(() => {
    const score = calculateScore();
    completeLevel("contract-maze", score);
    setGamePhase("review");

    // Trigger final animation after delay
    window.setTimeout(() => {
      if (score >= GAME_CONFIG.RATING_THRESHOLDS.B) {
        setShowShred(true);
      } else {
        setShowFinalStamp(true);
      }
    }, 800);
  }, [calculateScore, completeLevel]);

  // --- Computed values ---

  const totalScore = useMemo(() => calculateScore(), [calculateScore]);
  const rating = useMemo(() => getRating(totalScore), [getRating, totalScore]);

  const criticalCount = useMemo(
    () => trapClauses.filter((c) => c.severity === "critical").length,
    [trapClauses]
  );
  const warningCount = useMemo(
    () => trapClauses.filter((c) => c.severity === "warning").length,
    [trapClauses]
  );
  const foundCritical = useMemo(
    () =>
      [...foundClauses.keys()].filter((id) => {
        const c = trapClauses.find((t) => t.id === id);
        return c?.severity === "critical";
      }).length,
    [foundClauses, trapClauses]
  );
  const foundWarning = useMemo(
    () =>
      [...foundClauses.keys()].filter((id) => {
        const c = trapClauses.find((t) => t.id === id);
        return c?.severity === "warning";
      }).length,
    [foundClauses, trapClauses]
  );
  const foundByMagnifier = useMemo(
    () => [...foundClauses.values()].filter((m) => m === "magnifier").length,
    [foundClauses]
  );

  // --- Render ---

  return (
    <div
      className={clsx(
        "min-h-screen bg-[#12100c] text-white relative overflow-hidden",
        impact && "impact-shake"
      )}
    >
      {/* Pixi Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <PixiContractScene scanSignal={scanSignal} />
      </div>

      {/* Grain overlay */}
      <div className="pointer-events-none absolute inset-0 z-[2] grain-overlay opacity-30" />

      {/* Impact flash */}
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-[2] opacity-0 bg-[radial-gradient(circle_at_center,rgba(179,43,43,0.35),transparent_70%)]",
          impact && "impact-flash"
        )}
      />

      {/* DOM Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <header className="flex flex-col gap-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">
              Level 3 &middot; Contract Maze
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">
              合同迷宫：不平等条约排雷
            </h1>
            <p className="text-sm sm:text-base text-white/70">
              深夜审阅室 &mdash; 签字之前，仔细审查每一条。
            </p>
          </div>

          {/* Status bar */}
          <div className="glass-panel rounded-3xl px-5 py-4 text-[color:var(--ink)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[140px]">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                  HP
                </p>
                <div className="mt-2 h-2 rounded-full bg-black/10">
                  <div
                    className="h-2 rounded-full bg-[color:var(--accent)] transition-all duration-300"
                    style={{
                      width: `${(hp / GAME_CONFIG.MAX_HP) * 100}%`,
                    }}
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
                    className="h-2 rounded-full bg-[color:var(--success)] transition-all duration-300"
                    style={{ width: `${Math.min(exp, 100) * 0.8}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--muted-ink)]">
                  {exp} pts
                </p>
              </div>
              <div className="min-w-[100px]">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                  Progress
                </p>
                <p className="mt-2 text-xl font-display">
                  {foundClauses.size}/{trapClauses.length}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-ink)]">
                  已识别
                </p>
              </div>
              <div className="min-w-[100px]">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                  放大镜
                </p>
                <p className="mt-2 text-xl font-display">
                  {L3.MAGNIFIER_USES - magnifierUsed}/{L3.MAGNIFIER_USES}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-ink)]">
                  剩余
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/game"
                  className="rounded-full border border-[color:var(--accent)]/40 px-4 py-2 text-xs font-semibold text-[color:var(--accent)]"
                >
                  返回大厅
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main area */}
        <div
          className={clsx(
            "mt-8 gap-8",
            selectedClauseDetail || gamePhase === "review"
              ? "grid lg:grid-cols-[1fr_380px] lg:items-start"
              : "flex justify-center"
          )}
        >
          {/* Contract Paper Panel */}
          <div className="contract-paper mx-auto w-full max-w-3xl p-6 sm:p-8">
            {/* Contract header */}
            <div className="mb-6 border-b border-black/10 pb-4 text-center">
              <h2 className="text-xl font-bold text-[#1a1a1a]">劳动合同书</h2>
              <p className="mt-2 text-sm text-[#666]">
                甲方：{script.companyName}
              </p>
              <p className="text-sm text-[#666]">
                乙方（劳动者）：___________
              </p>
            </div>

            {/* Contract body */}
            <div
              ref={contractBodyRef}
              className="relative max-h-[65vh] overflow-y-auto pr-2 text-[13px] leading-7 text-[#333]"
            >
              {/* DOM-based scan beam overlay */}
              <AnimatePresence>
                {scanning && (
                  <motion.div
                    className="pointer-events-none absolute left-0 right-0 z-20 h-8"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent, rgba(59,130,246,0.12), rgba(59,130,246,0.25), rgba(59,130,246,0.12), transparent)",
                      boxShadow: "0 0 24px rgba(59,130,246,0.25)",
                    }}
                    initial={{ top: 0 }}
                    animate={{ top: "100%" }}
                    transition={{
                      duration: L3.SCAN_DURATION_MS / 1000,
                      ease: "linear",
                    }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              {segments.map((segment) => {
                if (segment.isBreak) return <br key={segment.id} />;
                if (segment.isSectionTitle) {
                  return (
                    <p key={segment.id} className="contract-section-title">
                      {segment.text}
                    </p>
                  );
                }

                const isFound = segment.clauseId
                  ? foundClauses.has(segment.clauseId)
                  : false;
                const isRevealing = segment.clauseId === scanRevealId;
                const isReview = gamePhase === "review";
                const isTrap = segment.clauseId !== null;
                const isMissed = isReview && isTrap && !isFound;

                return (
                  <span
                    key={segment.id}
                    id={
                      segment.clauseId
                        ? `clause-${segment.clauseId}`
                        : undefined
                    }
                    className={clsx(
                      "contract-text",
                      isFound &&
                        segment.severity === "critical" &&
                        "contract-found-critical",
                      isFound &&
                        segment.severity === "warning" &&
                        "contract-found-warning",
                      isMissed && "contract-missed",
                      isRevealing && "bg-blue-200/50",
                      gamePhase === "playing" && !isFound && "cursor-pointer contract-text-clickable"
                    )}
                    onClick={() => handleSegmentClick(segment)}
                  >
                    {segment.text}
                    {isFound && (
                      <motion.span
                        className={clsx(
                          "ml-0.5 inline-block rounded px-0.5 align-middle text-[9px] font-bold leading-none",
                          segment.severity === "critical"
                            ? "bg-red-500 text-white"
                            : "bg-amber-500 text-white"
                        )}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                      >
                        {segment.severity === "critical" ? "违法" : "风险"}
                      </motion.span>
                    )}
                    {isMissed && (
                      <span className="ml-0.5 inline-block rounded bg-red-100 px-1 align-middle text-[10px] font-bold text-red-600">
                        遗漏
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Contract footer */}
            <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4">
              <button
                type="button"
                disabled={
                  magnifierUsed >= L3.MAGNIFIER_USES ||
                  scanning ||
                  gamePhase !== "playing"
                }
                className={clsx(
                  "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
                  magnifierUsed >= L3.MAGNIFIER_USES || scanning
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                )}
                onClick={handleMagnifier}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                AI放大镜 ({L3.MAGNIFIER_USES - magnifierUsed}/
                {L3.MAGNIFIER_USES})
              </button>

              {gamePhase === "playing" && (
                <button
                  type="button"
                  className="rounded-full bg-[color:var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  onClick={handleSubmitReview}
                >
                  提交审查
                </button>
              )}

              {gamePhase === "review" && (
                <button
                  type="button"
                  className="rounded-full bg-[color:var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  onClick={() => window.location.reload()}
                >
                  重新挑战
                </button>
              )}
            </div>
          </div>

          {/* Detail Panel (playing) */}
          {selectedClauseDetail && gamePhase === "playing" && (
            <aside>
              <motion.div
                className="glass-panel rounded-3xl p-6 text-[color:var(--ink)]"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                key={selectedClauseDetail.id}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                    条款分析
                  </p>
                  <span
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      selectedClauseDetail.severity === "critical"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {selectedClauseDetail.severity === "critical"
                      ? "严重违法"
                      : "风险条款"}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold">
                  &ldquo;{selectedClauseDetail.text}&rdquo;
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-[color:var(--muted-ink)]">
                      法律依据
                    </p>
                    <p className="mt-1 text-[color:var(--accent)]">
                      {selectedClauseDetail.legalBasis}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[color:var(--muted-ink)]">
                      分析
                    </p>
                    <p className="mt-1">
                      {selectedClauseDetail.explanation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[color:var(--muted-ink)]">
                      建议
                    </p>
                    <p className="mt-1 text-[color:var(--success)]">
                      {selectedClauseDetail.suggestion}
                    </p>
                  </div>
                </div>
              </motion.div>
            </aside>
          )}

          {/* Review Panel */}
          {gamePhase === "review" && (
            <aside>
              <div className="glass-panel review-panel rounded-3xl p-6 text-[color:var(--ink)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                  审查报告
                </p>

                {/* Rating badge */}
                <div className="mt-4 flex items-center gap-6">
                  <div
                    className={clsx(
                      "flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold",
                      rating === "S"
                        ? "bg-amber-100 text-amber-600"
                        : rating === "A"
                          ? "bg-emerald-100 text-emerald-600"
                          : rating === "B"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {rating}
                  </div>
                  <div>
                    <p className="font-display text-2xl">{totalScore} 分</p>
                    <p className="mt-1 text-sm text-[color:var(--muted-ink)]">
                      识破 {foundClauses.size}/{trapClauses.length} 处条款
                    </p>
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="mt-4 space-y-1 text-xs text-[color:var(--muted-ink)]">
                  <p>
                    严重违法: {foundCritical}/{criticalCount} (&times;
                    {L3.SCORE.CRITICAL_FOUND}分)
                  </p>
                  <p>
                    风险条款: {foundWarning}/{warningCount} (&times;
                    {L3.SCORE.WARNING_FOUND}分)
                  </p>
                  <p>
                    放大镜辅助: {foundByMagnifier} (&times;
                    {L3.SCORE.MAGNIFIER_FOUND}分)
                  </p>
                  <p>
                    误判: {falsePositives} (&times;{L3.SCORE.FALSE_POSITIVE}分)
                  </p>
                </div>

                {/* All clauses list */}
                <div className="mt-6 space-y-3 review-scroll">
                  {trapClauses.map((clause) => {
                    const found = foundClauses.has(clause.id);
                    const method = foundClauses.get(clause.id);
                    return (
                      <div
                        key={clause.id}
                        className={clsx(
                          "rounded-2xl border px-4 py-3 text-sm",
                          found
                            ? "border-emerald-300 bg-emerald-100/70 text-emerald-900"
                            : "border-rose-300 bg-rose-100/70 text-rose-900"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{clause.text}</p>
                          <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] opacity-70">
                            {found
                              ? method === "magnifier"
                                ? "放大镜"
                                : "已识破"
                              : "遗漏"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs opacity-70">
                          {clause.legalBasis}
                        </p>
                        <p className="mt-1 text-xs opacity-80">
                          {clause.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Intro Overlay */}
      <AnimatePresence>
        {gamePhase === "intro" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mx-4 max-w-lg rounded-3xl bg-white/95 p-8 text-center text-[color:var(--ink)] shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                深夜审阅室
              </p>
              <h2 className="mt-4 font-display text-3xl">
                一份合同等待你的审查
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                HR发来消息：&ldquo;合同你看看，没问题就签字发回来哈～&rdquo;
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                这份来自「{script.companyName}
                」的劳动合同中隐藏了{" "}
                <strong className="text-[color:var(--accent)]">17处</strong>{" "}
                违法或不平等条款。仔细阅读每一条，点击你认为有问题的文字。
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                  严重违法 &times;{criticalCount}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                  风险条款 &times;{warningCount}
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                  AI放大镜 &times;{L3.MAGNIFIER_USES}
                </span>
              </div>
              <button
                type="button"
                className="mt-8 rounded-full bg-[color:var(--accent)] px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                onClick={() => setGamePhase("playing")}
              >
                开始审查
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OBJECTION Gavel Animation */}
      <AnimatePresence>
        {showObjection && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <div className="relative flex h-[380px] w-[380px] items-center justify-center">
              {/* Gavel */}
              <motion.div
                className="absolute flex flex-col items-center"
                initial={{ scale: 0.3, rotate: -30, y: -80 }}
                animate={{
                  scale: [0.3, 1.2, 1],
                  rotate: [-30, 5, 0],
                  y: [-80, 0, 0],
                }}
                transition={{
                  duration: 0.4,
                  type: "spring",
                  stiffness: 260,
                  damping: 16,
                }}
              >
                <div className="h-8 w-24 rounded-lg bg-gradient-to-b from-amber-500 to-amber-700 shadow-lg" />
                <div className="h-16 w-3 rounded-b-full bg-gradient-to-b from-amber-700 to-amber-900" />
              </motion.div>

              {/* Impact flash */}
              <motion.div
                className="absolute top-1/2 h-32 w-32 rounded-full bg-white/40"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 2, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.3, delay: 0.35 }}
              />

              {/* Text */}
              <motion.div
                className="absolute bottom-16 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.45 }}
              >
                <p className="font-display text-3xl text-white drop-shadow-lg">
                  异议成立
                </p>
                <motion.p
                  className="mt-2 text-sm text-white/80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                >
                  违法条款已锁定
                </motion.p>
              </motion.div>

              {/* Floating particles */}
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute text-lg font-bold text-amber-400/80"
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                  animate={{
                    x: (Math.random() - 0.5) * 200,
                    y: -80 - Math.random() * 120,
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.8],
                  }}
                  transition={{
                    duration: 1,
                    delay: 0.4 + i * 0.05,
                    ease: "easeOut",
                  }}
                >
                  法
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Animation: Contract Shred (high score) */}
      <AnimatePresence>
        {showShred && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 32 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-sm border border-black/5 bg-[#faf5eb]"
                style={{
                  width: 18 + Math.random() * 28,
                  height: 14 + Math.random() * 18,
                }}
                initial={{
                  x: (Math.random() - 0.5) * 280,
                  y: (Math.random() - 0.5) * 180,
                  rotate: 0,
                  opacity: 0,
                }}
                animate={{
                  y: 350 + Math.random() * 250,
                  x: (Math.random() - 0.5) * 550,
                  rotate: (Math.random() - 0.5) * 360,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: 0.3 + i * 0.04,
                  ease: "easeIn",
                }}
              />
            ))}
            <motion.p
              className="absolute font-display text-2xl text-emerald-400 drop-shadow-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              合同已撕碎
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Animation: Signed Stamp (low score) */}
      <AnimatePresence>
        {showFinalStamp && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rotate-[-15deg] rounded-lg border-4 border-red-600/60 px-8 py-4 text-6xl font-bold text-red-600/60"
              initial={{ scale: 3, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: -15, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.3,
              }}
            >
              已签署
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
