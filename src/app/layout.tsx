import type { Metadata } from "next";
import { Playfair_Display, Libre_Franklin } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

const franklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-franklin",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Idawa Capital",
  description: "Pilotage du pipeline et du portefeuille — Idawa Capital",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${playfair.variable} ${franklin.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
