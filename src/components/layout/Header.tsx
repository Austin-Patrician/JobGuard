import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            JobGuard
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/game"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              Game
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/community"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              情报局
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
