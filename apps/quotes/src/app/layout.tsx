import type { Metadata, Viewport } from "next";
import { Tracker } from "@skilldrunk/analytics/tracker";
import { GA4 } from "@skilldrunk/analytics/ga";
import "./globals.css";

const siteUrl = "https://quotes.skilldrunk.com";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Daily Dose · Skilldrunk",
    template: "%s · quotes.skilldrunk.com",
  },
  description:
    "Günlük ilham — her gün farklı bir söz, arkasında senin için nano detay. Skilldrunk ekosistemi.",
  openGraph: {
    title: "Daily Dose · Skilldrunk",
    description: "Günlük ilham dozu. Her söz, senin bağlamında.",
    type: "website",
    url: siteUrl,
    siteName: "Daily Dose",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Dose",
    description: "Günlük ilham dozu.",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Daily Dose",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin=""
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100 antialiased">
        {children}
        <Tracker />
        <GA4 />
      </body>
    </html>
  );
}
