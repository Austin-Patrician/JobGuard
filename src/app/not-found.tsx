import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-gray-600 dark:text-gray-400">Page not found</p>
      <Link
        href="/"
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
