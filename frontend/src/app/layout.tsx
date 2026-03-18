import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reelr - Create AI Videos in Minutes",
  description: "Generate professional AI-powered videos with motion graphics, cinematic effects, and custom presets. Pick a genre, choose a style, and let AI create your content.",
  keywords: ["AI video generator", "video creation", "AI videos", "motion graphics", "Sora AI", "video maker"],
  authors: [{ name: "Reelr" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F1115",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark max-w-[100vw] overflow-x-hidden">
      <body
        className={`${inter.variable} antialiased max-w-[100vw] overflow-x-hidden`}
      >
        <Providers>
          <Header />
          <main className="max-w-[100vw] overflow-x-hidden">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

