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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${sansFont.className} ${displayFont.variable} ${sansFont.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
