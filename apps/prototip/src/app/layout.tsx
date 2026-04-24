import type { Metadata } from "next";
import { Tracker } from "@skilldrunk/analytics/tracker";
import { GA4 } from "@skilldrunk/analytics/ga";
import "./globals.css";

const siteUrl = "https://prototip.skilldrunk.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "prototip — Özgür Gür",
    template: "%s · prototip.skilldrunk.com",
  },
  description:
    "Özgür Gür'ün prototip ve araç envanteri. Kronolojik. Canlı. Birlikte büyüyen bir ikinci beyin.",
  openGraph: {
    title: "prototip — Özgür Gür",
    description:
      "Kronolojik prototip envanteri: skilldrunk ekosistem + araçlar + deneyler.",
    type: "website",
    url: siteUrl,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
        <Tracker />
        <GA4 />
      </body>
    </html>
  );
}
