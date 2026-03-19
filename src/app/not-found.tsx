import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[color:var(--background)] px-4 text-[color:var(--foreground)]">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-[color:var(--muted-ink)]">Page not found</p>
      <Link
        href="/"
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
