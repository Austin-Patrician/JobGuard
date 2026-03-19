export function Footer() {
  return (
    <footer className="border-t border-[color:var(--paper-edge)] bg-[color:var(--background)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-[color:var(--muted-ink)]">
          &copy; {new Date().getFullYear()} JobGuard. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
