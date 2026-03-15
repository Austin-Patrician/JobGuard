"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PixiLawScene } from "@/components/law/PixiLawScene";

interface Citation {
  law: string;
  article: string;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
}

export default function LawChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "我是劳动法咨询助手。请描述你的合同或劳动问题，我会引用具体法条回答。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const lastAnswer = useMemo(() => {
    return [...messages].reverse().find((msg) => msg.role === "assistant");
  }, [messages]);

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/law-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "咨询失败");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer ?? "未返回答案",
        citations: data.citations ?? [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            (err as Error)?.message || "系统暂时不可用，请稍后再试。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <PixiLawScene />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220]/80 via-[#0b1220]/50 to-[#0b0f1e]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">
              JobGuard · Labor Law Desk
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">劳动法咨询</h1>
            <p className="text-sm text-white/70">
              对话为核心，引用法条，给出清晰、可执行的法律建议。
            </p>
          </div>
          <Link href="/" className="text-xs font-semibold text-white/70">
            返回首页
          </Link>
        </header>

        <div className="mt-10 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.32em] text-white/60">
                  最新结论
                </p>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/60">
                  引用驱动
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/90">
                {lastAnswer?.content ?? "等待你的问题..."}
              </p>
              {lastAnswer?.citations && lastAnswer.citations.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {lastAnswer.citations.map((item, index) => (
                    <div
                      key={`${item.article}-${index}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <p className="text-xs font-semibold text-white">
                        {item.law} {item.article}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              ref={chatBodyRef}
              className="max-h-[520px] space-y-4 overflow-y-auto pr-2"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    "flex flex-col gap-2",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={clsx(
                      "w-full max-w-[560px] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-white/10 bg-white/5 text-white/90"
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                      {msg.role === "user" ? "提问" : "解答"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {msg.content}
                    </p>
                  </div>

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="w-full max-w-[560px] space-y-2">
                      {msg.citations.map((item, index) => (
                        <div
                          key={`${msg.id}-${index}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2"
                        >
                          <p className="text-[11px] font-semibold text-white">
                            {item.law} {item.article}
                          </p>
                          <p className="mt-1 text-[11px] text-white/65">
                            {item.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  正在检索法条并生成解答...
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="输入你的问题，例如：1年合同试用期6个月合理吗？"
                className="min-h-[84px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 outline-none focus:border-white/30"
              />
              <button
                type="button"
                className={clsx(
                  "rounded-2xl px-6 py-3 text-sm font-semibold text-white transition",
                  loading
                    ? "bg-white/20"
                    : "bg-[#2f7bf6] hover:bg-[#2b6fe0]"
                )}
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? "处理中" : "发送咨询"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-white/60">
          回答仅供参考，涉及争议请咨询专业律师或主管部门。
        </p>
      </div>
    </div>
  );
}
