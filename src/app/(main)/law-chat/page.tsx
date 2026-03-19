"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { createUuid } from "@/lib/uuid";

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

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: ChatMessage = {
      id: createUuid(),
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
        id: createUuid(),
        role: "assistant",
        content: data.answer ?? "未返回答案",
        citations: data.citations ?? [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: createUuid(),
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
    <div className="relative min-h-screen overflow-hidden story-surface text-[color:var(--ink)]">

      <div className="pointer-events-none absolute inset-0">
        <div className="law-bubble float-bob absolute left-4 top-6 hidden h-14 w-14 rounded-full opacity-60 sm:block sm:left-6 sm:top-10 sm:h-20 sm:w-20 sm:opacity-70" />
        <div className="law-bubble float-bob-delayed absolute right-4 top-20 hidden h-16 w-16 rounded-full opacity-50 sm:block sm:right-10 sm:top-32 sm:h-24 sm:w-24 sm:opacity-60" />
        <div className="law-bubble float-bob absolute bottom-20 left-8 hidden h-12 w-12 rounded-full opacity-40 sm:block sm:left-16 sm:bottom-24 sm:h-16 sm:w-16 sm:opacity-50" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="law-chip">劳动法咨询</span>
              <span className="law-chip">引用法条</span>
              <span className="law-chip">温柔答疑</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl">法聊小屋</h1>
            <p className="text-sm text-[color:var(--muted-ink)]">
              用轻松的方式解释劳动法规，帮你把“话术”翻译成“规则”。
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-[color:var(--accent)]"
          >
            返回首页
          </Link>
        </header>

        <div className="mt-8 flex justify-center sm:mt-10">
          <div className="lawchat-shell">
            <div ref={chatBodyRef} className="lawchat-body space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    "lawchat-row",
                    msg.role === "user" ? "lawchat-row--right" : "lawchat-row--left"
                  )}
                >
                  <div
                    className={clsx(
                      "lawchat-bubble",
                      msg.role === "user"
                        ? "lawchat-bubble--user"
                        : msg.role === "assistant"
                          ? "lawchat-bubble--assistant"
                          : "lawchat-bubble--system"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm">
                      {msg.content}
                    </p>
                  </div>

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="lawchat-citations">
                      {msg.citations.map((item, index) => (
                        <div
                          key={`${msg.id}-${index}`}
                          className="law-note px-4 py-2"
                        >
                          <p className="text-[11px] font-semibold text-[#8a5d42]">
                            {item.law} {item.article}
                          </p>
                          <p className="mt-1 text-[11px] text-[#8a6b5a]">
                            {item.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="lawchat-row lawchat-row--left">
                  <div className="lawchat-bubble lawchat-bubble--assistant">
                    正在检索法条并生成解答...
                  </div>
                </div>
              )}
              <div />
            </div>

            <div className="lawchat-input">
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
                className="lawchat-textarea"
              />
              <button
                type="button"
                className={clsx(
                  "lawchat-send",
                  loading && "lawchat-send--disabled"
                )}
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? "处理中" : "发送"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs text-[color:var(--muted-ink)] sm:mt-6">
          回答仅供参考，涉及争议请咨询专业律师或主管部门。
        </p>
      </div>
    </div>
  );
}
