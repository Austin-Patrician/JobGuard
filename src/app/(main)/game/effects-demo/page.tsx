"use client";

import Link from "next/link";
import { useState } from "react";
import { PixiPrototypeScene, type HotspotInfo } from "@/components/game/PixiPrototypeScene";

const defaultHint = {
  title: "静候线索",
  detail: "轻触场景中的光点，查看解谜提示与机关描述。",
};

export default function EffectsDemoPage() {
  const [active, setActive] = useState<HotspotInfo | null>(null);

  const hint = active ?? defaultHint;

  return (
    <div className="min-h-screen desk-surface px-4 py-10 text-[color:var(--ink)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">
              Prototype · Narrative Puzzle
            </p>
            <h1 className="font-display text-3xl sm:text-4xl">
              叙事解谜场景原型
            </h1>
            <p className="mt-2 text-sm text-[color:var(--muted-ink)]">
              Monument Valley 视感 · 轻互动验证
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)]"
          >
            返回主页
          </Link>
        </header>

        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="paper-card p-4 sm:p-6">
            <div className="h-[60vh] min-h-[420px]">
              <PixiPrototypeScene onHotspot={setActive} />
            </div>
          </div>

          <aside className="paper-card flex h-full flex-col justify-between p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                线索记录
              </p>
              <h2 className="mt-3 font-display text-2xl">{hint.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                {hint.detail}
              </p>
            </div>
            <div className="mt-6 space-y-3 text-sm text-[color:var(--muted-ink)]">
              <p>交互反馈：高亮 + 镜头轻移 + 波纹扩散。</p>
              <p>目标：验证高表现力 2D 交互的视觉与手感。</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
