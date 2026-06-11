import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import AppPrivyProvider from "@/components/PrivyProvider";
import ReferralCapture from "@/components/rewards/ReferralCapture";
import { APP_URL } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "POKER ON SOLANA — On-Chain Texas Hold'em",
  description:
    "POKER ON SOLANA — on-chain Texas Hold'em. Real game, real stakes, provably fair tables on Solana.",
  openGraph: {
    title: "POKER ON SOLANA",
    description: "On-chain Texas Hold'em on Solana.",
    url: APP_URL,
    siteName: "POKER ON SOLANA",
    images: [{ url: "/assets/brand/solanawsop-chip.png", width: 648, height: 650 }],
    type: "website",
  },
  icons: {
    icon: [
      { url: "/assets/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/brand/solanawsop-icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/assets/brand/solanawsop-icon.png",
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ReferralCapture />
        <AppPrivyProvider>{children}</AppPrivyProvider>
      </body>
    </html>
  );
}
