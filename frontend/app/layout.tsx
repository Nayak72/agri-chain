import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AmbientBackground } from "@/components/shell/AmbientBackground";

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
      <body className="font-sans antialiased">
        <AmbientBackground />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
