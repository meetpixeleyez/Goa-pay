"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortalRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/merchant") ||
    pathname.startsWith("/qr-provider") ||
    pathname.startsWith("/agent") ||
    pathname.startsWith("/operator");

  if (isPortalRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased flex flex-col">
      <Navbar />
      <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-base-300 bg-base-100/60 py-4 text-center text-xs text-base-700">
        Mahadev Portal Payment Gateway System &copy; {new Date().getFullYear()} &bull; Dual-UTR Settlement Platform
      </footer>
    </div>
  );
}
