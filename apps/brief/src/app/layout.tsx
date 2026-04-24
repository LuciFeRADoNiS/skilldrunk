import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skilldrunk Brief",
  description: "Briefings modülü — skilldrunk portal üyesi",
  robots: { index: false, follow: false },
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
      </body>
    </html>
  );
}
