import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-[color:var(--paper-edge)] bg-[color:var(--background)]/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <img
              src="/jobguard-logo.svg"
              alt="JobGuard"
              className="h-7 w-7"
            />
            JobGuard
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[color:var(--muted-ink)] transition-colors hover:text-[color:var(--ink)]"
            >
              总览
            </Link>
            <Link
              href="/game"
              className="text-sm font-medium text-[color:var(--muted-ink)] transition-colors hover:text-[color:var(--ink)]"
            >
              闯关
            </Link>
            <Link
              href="/toolkit"
              className="text-sm font-medium text-[color:var(--muted-ink)] transition-colors hover:text-[color:var(--ink)]"
            >
              工具箱
            </Link>
            <Link
              href="/law-chat"
              className="text-sm font-medium text-[color:var(--muted-ink)] transition-colors hover:text-[color:var(--ink)]"
            >
              劳动法咨询
            </Link>
            
            <Link
              href="/community"
              className="text-sm font-medium text-[color:var(--muted-ink)] transition-colors hover:text-[color:var(--ink)]"
            >
              情报局
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
