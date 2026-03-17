"use client";

import Link from "next/link";
import clsx from "clsx";
import { useGameStore } from "@/stores";

const levels = [
  {
    id: "golden-eye",
    chapter: "第一关",
    title: "黄金眼",
    subtitle: "虚假 JD 识别",
    description: "通过“扫描解谜”方式找出招聘话术中的陷阱。",
    vibe: "扫描 · 取证 · 识破",
    href: "/game/level/golden-eye",
  },
  {
    id: "debate",
    chapter: "第二关",
    title: "唇枪舌战",
    subtitle: "高压面试对线",
    description: "与黑心 HR 话术博弈，稳住阵脚。",
    vibe: "对线 · 反驳 · 立场",
    href: "/game/level/debate",
  },
  {
    id: "contract-maze",
    chapter: "第三关",
    title: "合同迷宫",
    subtitle: "不平等条款排雷",
    description: "在复杂合同里筛查隐藏风险条款。",
    vibe: "条款 · 扫描 · 证据",
    href: "/game/level/contract-maze",
  },
];

export default function GameHubPage() {
  const progress = useGameStore((state) => state.levels);

  return (
    <div className="min-h-screen sky-surface text-[color:var(--ink)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">
              JobGuard · Story Mode
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">
              剧情闯关入口
            </h1>
            <p className="text-sm text-[color:var(--muted-ink)]">
              你将从第 1 关开始，逐步解锁更复杂的职场陷阱。这里只展示游戏关卡介绍。
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-[color:var(--accent)]"
          >
            返回首页
          </Link>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="paper-card p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                  剧情闯关模块
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                  按顺序挑战，才能进入下一关
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted-ink)]">
                  每个关卡都对应一个真实求职陷阱，完成后将解锁更复杂的任务。
                </p>
              </div>
              <div className="rounded-2xl bg-black/5 px-4 py-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                  已完成
                </p>
                <p className="mt-1 text-2xl font-display">
                  {Object.values(progress).filter((p) => p?.completed).length}/
                  {levels.length}
                </p>
              </div>
            </div>

            <div className="relative mt-8 space-y-5">
              {levels.map((level, index) => {
                const info = progress[level.id as keyof typeof progress];
                const locked = !info?.unlocked;
                const completed = info?.completed;
                const isLast = index === levels.length - 1;
                return (
                  <div key={level.id} className="relative pl-7">
                    {!isLast && (
                      <span className="absolute left-[7px] top-10 bottom-0 w-px story-line" />
                    )}
                    <span
                      className={clsx(
                        "absolute left-0 top-8 h-3 w-3 rounded-full story-orb",
                        locked && "opacity-50"
                      )}
                    />
                    <div
                      className={clsx(
                        "story-card px-5 py-4 transition sm:px-6",
                        locked && "opacity-80"
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                            {level.chapter}
                          </p>
                          <div className="mt-1 flex flex-wrap items-baseline gap-2">
                            <h3 className="font-display text-2xl">
                              {level.title}
                            </h3>
                            <span className="text-xs text-[color:var(--muted-ink)]">
                              {level.subtitle}
                            </span>
                          </div>
                        </div>
                        <div
                          className={clsx(
                            "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
                            locked
                              ? "border-transparent bg-black/5 text-[color:var(--muted-ink)]"
                              : completed
                                ? "border-emerald-200/60 bg-emerald-200/40 text-emerald-900"
                                : "border-amber-200/60 bg-amber-200/40 text-amber-900"
                          )}
                        >
                          {locked ? "未解锁" : completed ? "已完成" : "当前关"}
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                        {level.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="story-chip">{level.vibe}</span>
                        <span className="story-chip">
                          最佳评分 {info?.rating ?? "—"}
                        </span>
                        {locked && index > 0 && (
                          <span className="story-chip">完成上一关解锁</span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-ink)]">
                          {locked ? "尚未解锁" : "可进入"}
                        </p>
                        <Link
                          href={level.href}
                          className={clsx(
                            "rounded-full px-4 py-2 text-xs font-semibold transition",
                            locked
                              ? "pointer-events-none bg-black/10 text-[color:var(--muted-ink)]"
                              : "bg-[color:var(--accent)] text-white hover:opacity-90"
                          )}
                        >
                          {locked ? "锁定中" : "进入关卡"}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel self-start rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
              模式说明
            </p>
            <h3 className="mt-2 font-display text-2xl">
              剧情闯关玩法
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-ink)]">
              每一关都以真实求职陷阱为蓝本。识破得分越高，后续关卡越容易通过。
            </p>
            <div className="mt-4 grid gap-3 text-sm text-[color:var(--muted-ink)]">
              <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                  目标
                </p>
                <p className="mt-2">
                  发现话术陷阱、保护自身权益、累积觉悟值。
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                  进阶
                </p>
                <p className="mt-2">
                  需按顺序通关，才能解锁下一关卡剧情。
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--paper-edge)] bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
                  建议
                </p>
                <p className="mt-2">
                  先体验黄金眼，熟悉“扫描识别”的节奏。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
