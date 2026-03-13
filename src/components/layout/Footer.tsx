export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} JobGuard. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
