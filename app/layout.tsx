import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "PD Flow Explorer",
  description: "An interactive, visual walkthrough of the chip physical design flow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 place-items-center rounded border border-accent/40 bg-accent/10">
                <span className="h-2.5 w-2.5 rounded-[2px] bg-accent" />
              </span>
              <span className="text-sm font-semibold tracking-tight">PD Flow Explorer</span>
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-widest text-dim">v0.1</span>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
