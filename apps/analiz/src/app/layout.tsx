import type { Metadata } from "next";
import { Tracker } from "@skilldrunk/analytics/tracker";
import { GA4 } from "@skilldrunk/analytics/ga";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skilldrunk Analiz",
  description: "Veri analiz modülü — skilldrunk portal üyesi",
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
