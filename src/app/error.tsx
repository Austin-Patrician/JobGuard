"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[color:var(--background)] px-4 text-[color:var(--foreground)]">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-[color:var(--muted-ink)]">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
