import type { Metadata, Viewport } from "next";
import { Tracker } from "@skilldrunk/analytics/tracker";
import { GA4 } from "@skilldrunk/analytics/ga";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skilldrunk Admin",
  description: "skilldrunk ekosistem yönetim paneli",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  applicationName: "SD Admin",
  appleWebApp: {
    capable: true,
    title: "SD Admin",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iOS safe-area
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased pb-[env(safe-area-inset-bottom)]">
        {children}
        <PwaRegister />
        <Tracker />
        <GA4 />
      </body>
    </html>
  );
}
