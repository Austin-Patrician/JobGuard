"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
