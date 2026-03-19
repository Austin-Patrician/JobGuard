export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      {children}
    </div>
  );
}
