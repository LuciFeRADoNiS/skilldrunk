import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TrackerWithAuth } from "@/components/tracker-with-auth";
import { RecoveryHashBridge } from "@/components/recovery-hash-bridge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cellar display face (Fraunces). preload:false → not fetched on public pages;
// only the private Mine ([data-shell="mine"]) applies font-display. Dormant until then.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skilldrunk.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "skilldrunk — the library for AI skills",
    template: "%s · skilldrunk",
  },
  description:
    "Discover, discuss, and rank the best AI skills — Claude Skills, Custom GPTs, MCP servers, Cursor rules, and prompts. The Reddit for AI skills.",
  keywords: [
    "AI skills",
    "Claude skills",
    "MCP servers",
    "Custom GPTs",
    "Cursor rules",
    "prompt library",
    "agent skills",
  ],
  openGraph: {
    title: "skilldrunk — the library for AI skills",
    description:
      "Discover, discuss, and rank the best AI skills. Claude Skills, GPTs, MCP servers, Cursor rules, and prompts — all in one place.",
    url: siteUrl,
    siteName: "skilldrunk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "skilldrunk",
    description: "The library for AI skills.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <RecoveryHashBridge />
        {children}
        <Toaster />
        <TrackerWithAuth />
      </body>
    </html>
  );
}
