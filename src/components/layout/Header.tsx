"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "总览" },
  { href: "/game", label: "闯关" },
  { href: "/toolkit", label: "工具箱" },
  { href: "/law-chat", label: "劳动法咨询" },
  { href: "/community", label: "情报局" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = menuOpen ? "hidden" : originalOverflow;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <header className="relative z-40 border-b border-[color:var(--paper-edge)] bg-[color:var(--background)]/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold sm:text-xl">
            <img
              src="/jobguard-logo.svg"
              alt="JobGuard"
              className="h-7 w-7"
            />
            JobGuard
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--paper-edge)] bg-white/80 text-[color:var(--ink)] transition hover:bg-white sm:hidden"
            aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
            aria-expanded={menuOpen}
          >
            <span className="flex flex-col gap-1.5">
              <span className={`h-0.5 w-4 rounded-full bg-current transition ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`h-0.5 w-4 rounded-full bg-current transition ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-4 rounded-full bg-current transition ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>

          <nav className="hidden items-center gap-6 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-[color:var(--muted-ink)] transition-colors hover:text-[color:var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="关闭导航遮罩"
            className="fixed inset-0 top-16 z-40 bg-black/15 sm:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-4 top-[4.5rem] z-50 rounded-3xl border border-[color:var(--paper-edge)] bg-[color:var(--paper)] p-4 shadow-[0_18px_40px_-24px_var(--paper-shadow)] sm:hidden">
            <nav className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-black/5"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
