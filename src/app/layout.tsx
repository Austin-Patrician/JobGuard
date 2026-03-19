import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Sans_Condensed } from "next/font/google";
import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sansFont = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "JobGuard",
  description: "JobGuard - Your Job Protection Platform",
  icons: {
    icon: "/jobguard-logo.svg",
    shortcut: "/jobguard-logo.svg",
    apple: "/jobguard-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" style={{ colorScheme: "light" }}>
      <body
        className={`${sansFont.className} ${displayFont.variable} ${sansFont.variable} min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
