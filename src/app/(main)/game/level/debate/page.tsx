"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { getLevel2Script } from "@/data/scripts";
import type { DialogueOption } from "@/types/game";
import { useGameStore } from "@/stores";
import { GAME_CONFIG } from "@/lib/constants";

type ChatMessage = {
  id: string;
  role: "hr" | "player" | "system";
  content: string;
};

type NodeDecision = {
  nodeId: string;
  optionId: string;
  isCorrect: boolean;
  hpDelta: number;
  expDelta: number;
  feedback: string;
};

// --- Inline components ---

function Typewriter({
  text,
  speed = GAME_CONFIG.LEVEL2.TYPEWRITER_SPEED,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setDisplayed("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        onCompleteRef.current?.();
      }
    }, speed);
    return () => window.clearInterval(timer);
  }, [text, speed]);

  return <span>{displayed}</span>;
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <div className="wechat-avatar wechat-avatar-hr shrink-0">HR</div>
      <div className="wechat-bubble wechat-bubble-hr flex items-center gap-1 !py-3">
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-gray-400" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-gray-400" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-gray-400" />
      </div>
    </div>
  );
}

function ChatBubble({
  msg,
  isLatestHr,
}: {
  msg: ChatMessage;
  isLatestHr: boolean;
  onTypewriterComplete?: () => void;
}) {
  if (msg.role === "system") {
    return (
      <div className="flex justify-center px-4 py-1.5">
        <div className="wechat-bubble-system">{msg.content}</div>
      </div>
    );
  }

  if (msg.role === "hr") {
    return (
      <div className="flex items-start gap-2 px-4 py-2">
        <div className="wechat-avatar wechat-avatar-hr shrink-0">HR</div>
        <div className="wechat-bubble wechat-bubble-hr">
          {isLatestHr ? (
            <Typewriter text={msg.content} />
          ) : (
            msg.content
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-end gap-2 px-4 py-2">
      <div className="wechat-bubble wechat-bubble-player">{msg.content}</div>
      <div className="wechat-avatar wechat-avatar-player shrink-0">Me</div>
    </div>
  );
}

// --- Main page ---

export default function DebatePage() {
  const script = useMemo(() => getLevel2Script(), []);
  const decisionNodes = useMemo(
    () => script.nodes.filter((n) => n.options && n.options.length > 0),
    [script]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [waitingForChoice, setWaitingForChoice] = useState(false);
  const [decisions, setDecisions] = useState<NodeDecision[]>([]);
  const [freeInputText, setFreeInputText] = useState("");
  const [impact, setImpact] = useState(false);
  const [showObjection, setShowObjection] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const chatBodyRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const timeoutRefs = useRef<number[]>([]);

  const hp = useGameStore((s) => s.hp);
  const exp = useGameStore((s) => s.exp);
  const adjustHp = useGameStore((s) => s.adjustHp);
  const adjustExp = useGameStore((s) => s.adjustExp);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const setCurrentLevel = useGameStore((s) => s.setCurrentLevel);
  const getRating = useGameStore((s) => s.getRating);

  useEffect(() => {
    setCurrentLevel("debate");
  }, [setCurrentLevel]);

  // Auto-scroll on messages change
  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [messages, isTyping]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const refs = timeoutRefs;
    return () => {
      refs.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  }, []);

  const pushMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const triggerImpact = useCallback(() => {
    setImpact(true);
    window.setTimeout(() => setImpact(false), 350);
  }, []);

  const latestHrId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "hr") return messages[i].id;
    }
    return null;
  }, [messages]);

  // Find the index of a node by id
  const getNodeIndexById = useCallback(
    (nodeId: string) => script.nodes.findIndex((n) => n.id === nodeId),
    [script]
  );

  // Process a node
  const processNode = useCallback(
    (index: number) => {
      if (processingRef.current) return;
      if (index < 0 || index >= script.nodes.length) return;
      processingRef.current = true;

      const node = script.nodes[index];
      setCurrentNodeIndex(index);

      if (node.speaker === "hr") {
        setIsTyping(true);
        addTimeout(() => {
          setIsTyping(false);
          const msgId = `msg-${node.id}-${Date.now()}`;
          pushMessage({ id: msgId, role: "hr", content: node.text });

          // After typewriter finishes (approximate time)
          const typewriterDuration = node.text.length * GAME_CONFIG.LEVEL2.TYPEWRITER_SPEED + 200;
          addTimeout(() => {
            if (node.options && node.options.length > 0) {
              setWaitingForChoice(true);
              processingRef.current = false;
            } else if (node.nextNodeId) {
              processingRef.current = false;
              addTimeout(() => {
                const nextIdx = getNodeIndexById(node.nextNodeId!);
                processNode(nextIdx);
              }, GAME_CONFIG.LEVEL2.HR_AUTO_ADVANCE_DELAY);
            } else {
              // nextNodeId is null => game complete
              processingRef.current = false;
              // Will be triggered after final node
              addTimeout(() => {
                onGameComplete();
              }, 1000);
            }
          }, typewriterDuration);
        }, GAME_CONFIG.LEVEL2.HR_REPLY_DELAY);
      } else {
        // system or player nodes that have no options (auto-advance)
        pushMessage({ id: `msg-${node.id}-${Date.now()}`, role: node.speaker, content: node.text });
        processingRef.current = false;
        if (node.nextNodeId) {
          addTimeout(() => {
            const nextIdx = getNodeIndexById(node.nextNodeId!);
            processNode(nextIdx);
          }, GAME_CONFIG.LEVEL2.HR_AUTO_ADVANCE_DELAY);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [script, addTimeout, pushMessage, getNodeIndexById]
  );

  // Game completion
  const onGameComplete = useCallback(() => {
    const totalScore = decisions.reduce((sum, d) => {
      if (d.isCorrect) return sum + GAME_CONFIG.LEVEL2.SCORE.CORRECT;
      if (d.expDelta > 0) return sum + GAME_CONFIG.LEVEL2.SCORE.PARTIAL;
      return sum + GAME_CONFIG.LEVEL2.SCORE.WRONG;
    }, 0);
    const clamped = Math.max(0, Math.min(100, totalScore));
    completeLevel("debate", clamped);
    setGameComplete(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions, completeLevel]);

  // Start the chat
  useEffect(() => {
    if (messages.length === 0 && !processingRef.current) {
      processNode(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = useCallback(
    (option: DialogueOption) => {
      setWaitingForChoice(false);

      const node = script.nodes[currentNodeIndex];
      pushMessage({
        id: `msg-player-${node.id}-${Date.now()}`,
        role: "player",
        content: option.text,
      });

      adjustHp(option.hpDelta);
      adjustExp(option.expDelta);

      const decision: NodeDecision = {
        nodeId: node.id,
        optionId: option.id,
        isCorrect: option.isCorrect,
        hpDelta: option.hpDelta,
        expDelta: option.expDelta,
        feedback: option.feedback,
      };
      setDecisions((prev) => [...prev, decision]);

      if (!option.isCorrect) {
        triggerImpact();
      }

      if (option.isCorrect) {
        setShowObjection(true);
        addTimeout(() => setShowObjection(false), 1700);
      }

      addTimeout(() => {
        pushMessage({
          id: `msg-feedback-${node.id}-${Date.now()}`,
          role: "system",
          content: `${option.isCorrect ? "v" : "x"} ${option.feedback}`,
        });

        addTimeout(() => {
          if (node.nextNodeId) {
            const nextIdx = getNodeIndexById(node.nextNodeId);
            processNode(nextIdx);
          } else {
            onGameComplete();
          }
        }, 1500);
      }, 400);
    },
    [
      script,
      currentNodeIndex,
      pushMessage,
      adjustHp,
      adjustExp,
      triggerImpact,
      addTimeout,
      getNodeIndexById,
      processNode,
      onGameComplete,
    ]
  );

  const handleFreeInput = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setWaitingForChoice(false);
      setFreeInputText("");

      const node = script.nodes[currentNodeIndex];
      pushMessage({
        id: `msg-player-free-${node.id}-${Date.now()}`,
        role: "player",
        content: text.trim(),
      });

      adjustHp(GAME_CONFIG.LEVEL2.FREE_INPUT.HP_DELTA);
      adjustExp(GAME_CONFIG.LEVEL2.FREE_INPUT.EXP_DELTA);

      const feedback = "自由作答模式：勇于质疑本身就是最好的防御。";
      const decision: NodeDecision = {
        nodeId: node.id,
        optionId: "__free_input__",
        isCorrect: false,
        hpDelta: GAME_CONFIG.LEVEL2.FREE_INPUT.HP_DELTA,
        expDelta: GAME_CONFIG.LEVEL2.FREE_INPUT.EXP_DELTA,
        feedback,
      };
      setDecisions((prev) => [...prev, decision]);

      triggerImpact();

      addTimeout(() => {
        pushMessage({
          id: `msg-feedback-free-${node.id}-${Date.now()}`,
          role: "system",
          content: feedback,
        });

        addTimeout(() => {
          if (node.nextNodeId) {
            const nextIdx = getNodeIndexById(node.nextNodeId);
            processNode(nextIdx);
          } else {
            onGameComplete();
          }
        }, 1500);
      }, 400);
    },
    [
      script,
      currentNodeIndex,
      pushMessage,
      adjustHp,
      adjustExp,
      triggerImpact,
      addTimeout,
      getNodeIndexById,
      processNode,
      onGameComplete,
    ]
  );

  const currentNode = script.nodes[currentNodeIndex];
  const correctCount = decisions.filter((d) => d.isCorrect).length;

  const totalScore = useMemo(() => {
    const raw = decisions.reduce((sum, d) => {
      if (d.isCorrect) return sum + GAME_CONFIG.LEVEL2.SCORE.CORRECT;
      if (d.expDelta > 0) return sum + GAME_CONFIG.LEVEL2.SCORE.PARTIAL;
      return sum + GAME_CONFIG.LEVEL2.SCORE.WRONG;
    }, 0);
    return Math.max(0, Math.min(100, raw));
  }, [decisions]);

  const finalRating = useMemo(() => getRating(totalScore), [getRating, totalScore]);

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
              Level 2 &middot; Debate
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">
              唇枪舌战：HR 对线
            </h1>
            <p className="text-sm sm:text-base text-white/70">
              {script.scenario}
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
                    className="h-2 rounded-full bg-[color:var(--accent)] transition-all duration-300"
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
                    className="h-2 rounded-full bg-[color:var(--success)] transition-all duration-300"
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
                  {decisions.length}/{decisionNodes.length}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-ink)]">
                  已回答
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/game"
                  className="rounded-full border border-[color:var(--accent)]/40 px-4 py-2 text-xs font-semibold text-[color:var(--accent)]"
                >
                  返回大厅
                </Link>
                {gameComplete && (
                  <button
                    type="button"
                    className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                    onClick={() => window.location.reload()}
                  >
                    重新挑战
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div
          className={clsx(
            "mt-8 gap-8",
            gameComplete
              ? "grid lg:grid-cols-[420px_1fr] lg:items-start"
              : "flex justify-center"
          )}
        >
          {/* Phone Shell */}
          <div className={clsx("w-full", gameComplete ? "" : "max-w-[420px]")}>
            <div className="phone-shell">
              <div className="phone-screen phone-screen-chat text-[#1b2333]">
                {/* Phone status bar */}
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

                {/* WeChat header */}
                <div className="wechat-header">
                  <span className="text-sm text-[#5c6b7d]">&lsaquo;</span>
                  <div className="wechat-avatar wechat-avatar-hr text-[10px]">
                    {script.hrAvatar}
                  </div>
                  <span className="text-sm font-semibold text-[#1f2a37]">
                    {script.hrName}
                  </span>
                </div>

                {/* Chat body */}
                <div
                  ref={chatBodyRef}
                  className="wechat-bg wechat-chat-body"
                >
                  {messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      msg={msg}
                      isLatestHr={msg.id === latestHrId}
                    />
                  ))}
                  {isTyping && <TypingIndicator />}
                </div>

                {/* Input bar */}
                <div className="wechat-input-bar">
                  {waitingForChoice && currentNode?.options ? (
                    <div className="space-y-2">
                      {currentNode.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="w-full rounded-xl bg-white px-4 py-3 text-left text-[13px] text-[#1b1b1b] shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
                          onClick={() => handleChoice(opt)}
                        >
                          {opt.text}
                        </button>
                      ))}
                      {currentNode.allowFreeInput && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={freeInputText}
                            onChange={(e) => setFreeInputText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFreeInput(freeInputText);
                            }}
                            placeholder="或输入你的回答..."
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-[#1b1b1b] outline-none focus:border-[#95ec69]"
                          />
                          <button
                            type="button"
                            className="shrink-0 rounded-lg bg-[#07c160] px-4 py-2 text-[13px] font-semibold text-white"
                            onClick={() => handleFreeInput(freeInputText)}
                          >
                            发送
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white/60 px-3 py-2 text-[13px] text-gray-400">
                      {gameComplete ? "对话已结束" : "等待对方消息..."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results panel */}
          {gameComplete && (
            <aside className="space-y-4">
              <div className="glass-panel review-panel rounded-3xl p-6 text-[color:var(--ink)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                  对线复盘
                </p>
                <div className="mt-4 flex items-center gap-6">
                  <div
                    className={clsx(
                      "flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold",
                      finalRating === "S"
                        ? "bg-amber-100 text-amber-600"
                        : finalRating === "A"
                          ? "bg-emerald-100 text-emerald-600"
                          : finalRating === "B"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {finalRating}
                  </div>
                  <div>
                    <p className="font-display text-2xl">{totalScore} 分</p>
                    <p className="mt-1 text-sm text-[color:var(--muted-ink)]">
                      答对 {correctCount}/{decisionNodes.length} 题
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 review-scroll">
                  {decisions.map((d, i) => {
                    const node = script.nodes.find((n) => n.id === d.nodeId);
                    const hrQuestion = node?.text ?? "";
                    const truncated =
                      hrQuestion.length > 40
                        ? hrQuestion.slice(0, 40) + "..."
                        : hrQuestion;
                    const chosenOption = node?.options?.find(
                      (o) => o.id === d.optionId
                    );
                    const choiceText =
                      d.optionId === "__free_input__"
                        ? "(自由作答)"
                        : chosenOption?.text ?? "";

                    return (
                      <div
                        key={d.nodeId}
                        className={clsx(
                          "rounded-2xl border px-4 py-3 text-sm",
                          d.isCorrect
                            ? "border-emerald-300 bg-emerald-100/70 text-emerald-900"
                            : "border-rose-300 bg-rose-100/70 text-rose-900"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-[color:var(--muted-ink)]">
                            Q{i + 1}: {truncated}
                          </p>
                          <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] opacity-70">
                            {d.isCorrect ? "正确" : "错误"}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold">{choiceText}</p>
                        <p className="mt-2 text-xs opacity-80">{d.feedback}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </aside>
          )}
        </div>
      </div>

      {/* OBJECTION animation */}
      <AnimatePresence>
        {showObjection && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <div className="relative flex h-[420px] w-[420px] items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-[120px] bg-[radial-gradient(circle_at_top,#fff3d6,transparent_60%)] shadow-[0_40px_120px_rgba(255,164,114,0.25)]"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              <motion.div
                className="absolute -right-8 top-10 h-20 w-20 rounded-full bg-[#ffe7f0] opacity-80"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 12 }}
                transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.1 }}
              />
              <motion.div
                className="absolute left-6 bottom-8 h-14 w-14 rounded-full bg-[#e8f7ff] opacity-90"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.18 }}
              />

              <motion.div
                className="absolute left-8 top-10 rounded-[24px] bg-[#fff4e6] px-6 py-3 text-xl font-display text-[#d4473c] shadow-[0_14px_30px_rgba(212,71,60,0.22)]"
                initial={{ x: -24, y: -10, scale: 0.6, opacity: 0 }}
                animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
              >
                有力反驳
              </motion.div>

              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
              >
                <motion.div
                  className="rounded-full border-[3px] border-[#ff6f91] bg-white/95 px-10 py-7 text-3xl font-display tracking-[0.22em] text-[#ff6f91] shadow-[0_20px_50px_rgba(255,111,145,0.28)]"
                  initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 12 }}
                >
                  OBJECTION
                </motion.div>
              </motion.div>

              <motion.div
                className="absolute bottom-10 left-1/2 w-max -translate-x-1/2 rounded-full bg-[#e8f7ff] px-6 py-2 text-base font-semibold text-[#1f6b9a] shadow-[0_12px_26px_rgba(31,107,154,0.18)]"
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.2 }}
              >
                成功识破HR话术
              </motion.div>

              <motion.div
                className="absolute -bottom-2 right-10 rotate-6 rounded-[18px] bg-[#fff0f7] px-4 py-2 text-xs font-semibold text-[#d85687] shadow-[0_10px_20px_rgba(216,86,135,0.2)]"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.26 }}
              >
                识破话术 +1
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
