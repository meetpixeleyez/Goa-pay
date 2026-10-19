"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldCheck, LogOut, ArrowRight, UserCircle2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser, logoutUser } from "@/store/slices/authSlice";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading, initialized } = useAppSelector((state) => state.auth);
  const loading = !initialized && authLoading;

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-base-300 shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xl shadow-md">
                MP
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-base-900">Mahadev Portal</span>
                <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary-800 font-medium">
                  Gateway
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/merchant"
              className={`transition-colors ${
                pathname.startsWith("/merchant") ? "text-primary-700 font-semibold" : "text-slate-600 hover:text-primary-600"
              }`}
            >
              Merchant Portal
            </Link>
            <Link
              href="/qr-provider"
              className={`transition-colors ${
                pathname.startsWith("/qr-provider") ? "text-primary-700 font-semibold" : "text-slate-600 hover:text-primary-600"
              }`}
            >
              QR Provider Portal
            </Link>
            <Link
              href="/admin"
              className={`transition-colors ${
                pathname.startsWith("/admin") ? "text-primary-700 font-semibold" : "text-slate-600 hover:text-primary-600"
              }`}
            >
              Admin Dashboard
            </Link>
          </nav>

          {/* User Auth Section */}
          <div className="flex items-center space-x-3">
            {!loading && user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-base-900">{user.name}</div>
                  <div className="text-[11px] text-primary-600 font-semibold uppercase">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-xs bg-white text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-md border border-base-300 shadow-sm transition"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1 text-xs font-semibold bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-md shadow-sm transition"
              >
                <span>Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
