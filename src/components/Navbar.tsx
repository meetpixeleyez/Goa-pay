"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ShieldCheck, LogOut, ArrowRight, UserCircle2, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser, logoutUser } from "@/store/slices/authSlice";
import ModalPortal from "@/components/common/ModalPortal";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading, initialized } = useAppSelector((state) => state.auth);
  const loading = !initialized && authLoading;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await dispatch(logoutUser());
      setShowLogoutConfirm(false);
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
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
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center space-x-1 text-xs bg-white text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-md border border-base-300 shadow-sm transition cursor-pointer"
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

      {/* Sign Out Confirmation Modal */}
      {showLogoutConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">Sign Out</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Are you sure you want to sign out of your account?
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Signed in as</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase">
                    {user?.role}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm truncate">
                  {user?.name}
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                You will need to enter your credentials to access your account again.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Signing Out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="size-3.5" />
                      <span>Yes, Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </header>
  );
}
