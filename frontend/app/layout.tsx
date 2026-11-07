import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import TopNav from "@/components/layout/top-nav";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: "400" });
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], variable: "--font-dm-serif-display", weight: "400" });

export const metadata: Metadata = {
  title: "AgriChain",
  description: "Blockchain-Inspired Agricultural Supply Chain and Freight Transportation Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${dmSerifDisplay.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}