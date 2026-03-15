export default function DashboardPage() {
  return (
    <div className="min-h-screen story-surface text-[color:var(--ink)]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 story-halo" />
        <div className="pointer-events-none absolute inset-0 grain-overlay opacity-30" />

        <section className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="story-chip">叙事解谜</span>
                <span className="story-chip">求职防坑</span>
                <span className="story-chip">夜间开场</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl">
                不是每一次“机会”
                <br />
                都是通往未来的门
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-[color:var(--muted-ink)] sm:text-base">
                你将进入一个被话术与合同包围的职场迷宫。识破陷阱、保护权益、一步步升级你的防坑直觉。
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#modules"
                  className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(179,43,43,0.3)] transition hover:-translate-y-0.5"
                >
                  了解模块
                </a>
                <a
                  href="/game"
                  className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-white"
                >
                  开始闯关
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="story-orb absolute -right-10 top-10 h-24 w-24 rounded-full opacity-60" />
              <div className="story-orb absolute -left-6 bottom-8 h-16 w-16 rounded-full opacity-50" />
              <div className="paper-card relative p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
                  叙事场景
                </p>
                <h2 className="mt-2 font-display text-2xl">
                  深夜求职对话
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                  “试用期 6 个月打 8 折”“先交培训费”。你要在对话里识破每一处漏洞。
                </p>
                <div className="mt-4 space-y-3">
                  <div className="story-card px-4 py-3 text-xs text-[color:var(--muted-ink)]">
                    HR：试用期工资打折，这是惯例。
                  </div>
                  <div className="story-card ml-auto w-4/5 px-4 py-3 text-xs text-[color:var(--ink)]">
                    你：合同期限与试用期的合法依据是什么？
                  </div>
                  <div className="story-card px-4 py-3 text-xs text-[color:var(--muted-ink)]">
                    HR：先签劳务协议，效果一样。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="modules" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              num: "01",
              title: "剧情闯关",
              desc: "三关联动：JD 识别 → HR 对线 → 合同排雷。按顺序解锁。",
              status: "开放中",
              chips: ["黄金眼", "唇枪舌战", "合同迷宫"],
              href: "/game",
              cta: "开始闯关",
            },
            {
              num: "02",
              title: "实用工具箱",
              desc: "粘贴 JD 或聊天记录，AI 给出红绿灯评级与话术翻译。",
              status: "已开放",
              chips: ["照妖镜", "合同避雷针", "红绿灯评级"],
              href: "/toolkit",
              cta: "进入工具箱",
            },
            {
              num: "03",
              title: "避坑情报局",
              desc: "匿名经验汇总，AI 脱敏归纳骗术，生成热力图与标签。",
              status: "已开放",
              chips: ["匿名投稿", "热力地图", "骗术标签"],
              href: "/community",
              cta: "进入情报局",
            },
          ].map((mod) => (
            <a
              key={mod.num}
              href={mod.href}
              className="paper-card flex flex-col p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">
                  {mod.num}
                </span>
                <span className="story-chip">{mod.status}</span>
              </div>
              <h3 className="mt-2 font-display text-2xl">{mod.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted-ink)]">
                {mod.desc}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {mod.chips.map((chip) => (
                  <span key={chip} className="boss-chip">
                    {chip}
                  </span>
                ))}
              </div>
              <span className="mt-auto pt-4 text-xs font-semibold text-[color:var(--accent)]">
                {mod.cta} &rarr;
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
