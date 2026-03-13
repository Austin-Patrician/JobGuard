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

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "扫描识别",
              desc: "在 JD 中找出“漂亮话”的真实含义。",
            },
            {
              title: "对线反驳",
              desc: "面对 HR 话术，稳住立场并反问关键点。",
            },
            {
              title: "合同排雷",
              desc: "在长文本里捕捉隐性条款与违约陷阱。",
            },
          ].map((item) => (
            <div key={item.title} className="story-card px-5 py-4">
              <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--muted-ink)]">
                Step
              </p>
              <h3 className="mt-2 font-display text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--muted-ink)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="relative">
          <div className="absolute left-3 top-0 hidden h-full w-px story-line sm:block" />
          <div className="space-y-8">
            {[
              {
                label: "模块一",
                title: "剧情闯关",
                desc: "三关联动推进：JD 识别 → HR 对线 → 合同排雷。按顺序解锁。",
                status: "开放中",
                chips: ["黄金眼", "唇枪舌战", "合同迷宫"],
              },
              {
                label: "模块二",
                title: "实用工具箱",
                desc: "粘贴 JD 或聊天记录，AI 自动给出红绿灯评级与话术翻译。",
                status: "已开放",
                chips: ["照妖镜", "合同避雷针", "红绿灯评级"],
                href: "/toolkit",
              },
              {
                label: "模块三",
                title: "避坑情报局",
                desc: "匿名经验汇总，AI 脱敏归纳骗术，生成行业热力与标签。",
                status: "已开放",
                chips: ["匿名投稿", "热力地图", "骗术标签"],
                href: "/community",
              },
            ].map((mod, index) => {
              const inner = (
                <div className="paper-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
                        {mod.label}
                      </p>
                      <h3 className="mt-2 font-display text-3xl">
                        {mod.title}
                      </h3>
                    </div>
                    <span className="story-chip">{mod.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-ink)]">
                    {mod.desc}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {mod.chips.map((chip) => (
                      <span key={chip} className="boss-chip">
                        {chip}
                      </span>
                    ))}
                    {index === 2 && mod.href && (
                      <span className="boss-chip">进入情报局 &rarr;</span>
                    )}
                  </div>
                </div>
              );
              return (
                <div key={mod.label} className="relative sm:pl-10">
                  <div className="hidden sm:block absolute left-0 top-7 h-3 w-3 rounded-full border border-black/20 bg-white" />
                  {"href" in mod && mod.href ? (
                    <a href={mod.href} className="block transition hover:-translate-y-0.5">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="story-card flex flex-col items-start gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">
              进入剧情
            </p>
            <h3 className="mt-2 font-display text-2xl">
              从第一关开始，逐步解锁
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted-ink)]">
              每一步都在训练你的判断力。
            </p>
          </div>
          <a
            href="/game"
            className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(179,43,43,0.25)] transition hover:-translate-y-0.5"
          >
            开始闯关
          </a>
        </div>
      </section>
    </div>
  );
}
