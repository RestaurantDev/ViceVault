import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Vice Vault | Turn Bad Habits into Generational Wealth",
  description: "Transform behavioral discipline into quantifiable wealth with institutional-grade DCA backtesting. See exactly how your sobriety would have performed in the S&P 500, Bitcoin, or NVIDIA.",
  keywords: ["habit tracker", "investment calculator", "DCA", "dollar cost averaging", "sobriety", "financial freedom"],
  openGraph: {
    title: "Vice Vault | Turn Bad Habits into Generational Wealth",
    description: "See exactly how your vice money would have grown if invested. Institutional-grade backtesting with real market data.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-canvas`}
      >
        {children}
      </body>
    </html>
  );
}
