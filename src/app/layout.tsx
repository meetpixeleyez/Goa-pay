import type { Metadata } from "next";
import "@/styles/globals.css";
import AppWrapper from "@/components/layout/AppWrapper";
import ReduxProvider from "@/store/provider";

export const metadata: Metadata = {
  title: "Mahadev Portal | Payment & Liquidity Infrastructure",
  description: "Production payment gateway with dynamic QR code allocation and dual-UTR settlement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans bg-[var(--background)] text-[var(--foreground)] antialiased">
        <ReduxProvider>
          <AppWrapper>{children}</AppWrapper>
        </ReduxProvider>
      </body>
    </html>
  );
}
