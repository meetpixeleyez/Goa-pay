"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  Store,
  QrCode,
  ShoppingBag,
  Wallet,
  Receipt,
  Settings,
  PlusCircle,
  ShieldCheck,
  UserCheck,
  UserPlus,
  User,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Briefcase,
  Bell,
  Wifi,
  KeyRound,
  BookOpen,
  CircleEllipsis,
  ArrowLeftRight,
  RefreshCw,
} from "lucide-react";
import ModalPortal from "@/components/common/ModalPortal";
import { useSocket } from "@/lib/socket-client";
import RealtimeNotificationBanner from "@/components/notifications/RealtimeNotificationBanner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchCurrentUser,
  logoutUser,
  fetchAvailablePayoutCount,
  incrementAvailablePayoutCount,
  decrementAvailablePayoutCount,
} from "@/store/slices/authSlice";

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

interface PortalLayoutProps {
  portal: "admin" | "merchant" | "qr-provider" | "agent" | "operator";
  title: string | React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  action?: React.ReactNode;
}

export default function PortalLayout({
  portal,
  title,
  subtitle,
  children,
  actions,
  action,
}: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dispatch = useAppDispatch();
  const { user, loading: authLoading, initialized, availablePayoutCount } = useAppSelector(
    (state) => state.auth
  );

  const qrAvailableCount = availablePayoutCount;
  const loading = !initialized && authLoading;

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // Authorization check when user or initialized changes
  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Check role authorization for current portal
    const role = user.role;
    if (portal === "admin" && role !== "ADMIN") router.push("/login");
    if (portal === "merchant" && role !== "MERCHANT" && role !== "ADMIN") router.push("/login");
    if (portal === "qr-provider" && role !== "QR_PROVIDER" && role !== "ADMIN") router.push("/login");
    if (portal === "agent" && role !== "AGENT" && role !== "ADMIN") router.push("/login");
    if (portal === "operator" && role !== "OPERATOR" && role !== "ADMIN") router.push("/login");

    if (portal === "qr-provider" || portal === "operator") {
      dispatch(fetchAvailablePayoutCount({ portal }));
    }
  }, [user, initialized, portal, router, dispatch]);

  const { socket, isConnected } = useSocket({
    role: user?.role,
    userId: user?.id,
  });

  useEffect(() => {
    if (!socket) return;

    const handlePayoutAvailable = () => {
      dispatch(incrementAvailablePayoutCount());
    };

    const handlePayoutClaimed = () => {
      dispatch(decrementAvailablePayoutCount());
    };

    const handleStatsUpdate = () => {
      if (portal === "qr-provider" || portal === "operator") {
        dispatch(fetchAvailablePayoutCount({ portal }));
      }
    };

    socket.on("payout:available", handlePayoutAvailable);
    socket.on("payout:claimed", handlePayoutClaimed);
    socket.on("payout:released", handlePayoutAvailable);
    socket.on("stats:update", handleStatsUpdate);

    return () => {
      socket.off("payout:available", handlePayoutAvailable);
      socket.off("payout:claimed", handlePayoutClaimed);
      socket.off("payout:released", handlePayoutAvailable);
      socket.off("stats:update", handleStatsUpdate);
    };
  }, [socket, portal, dispatch]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const navItemsMap: Record<string, { brand: string; items: NavItem[] }> = {
    admin: {
      brand: "Admin Portal",
      items: [
        { label: "Users", href: "/admin/users", icon: Users },
        { label: "Hawala", href: "/admin/hawala", icon: ArrowLeftRight },
      ],
    },
    merchant: {
      brand: "Merchant Portal",
      items: [
        { label: "Dashboard", href: "/merchant", icon: LayoutDashboard },
        { label: "Orders", href: "/merchant/orders", icon: ShoppingBag },
        { label: "Transactions", href: "/merchant/transactions", icon: Receipt },
        { label: "Profile & Settings", href: "/merchant/profile", icon: User },
      ],
    },
    "qr-provider": {
      brand: "QR Provider Portal",
      items: [
        { label: "Dashboard", href: "/qr-provider", icon: LayoutDashboard },
        { label: "Operators", href: "/qr-provider/operators", icon: Users },
        { label: "Provider Profile", href: "/qr-provider/profile", icon: User },
      ],
    },
    operator: {
      brand: "Operator Portal",
      items: [
        { label: "Dashboard", href: "/operator", icon: LayoutDashboard },
        { label: "Assigned Orders", href: "/operator/orders", icon: ShoppingBag },
        { label: "Available Orders", href: "/operator/available-orders", icon: UserCheck },
        { label: "Collection QRs", href: "/operator/qr-codes", icon: QrCode },
        { label: "Operator Profile", href: "/operator/profile", icon: User },
      ],
    },
    agent: {
      brand: "Agent Portal",
      items: [
        { label: "Dashboard", href: "/agent", icon: LayoutDashboard },
        { label: "QR Providers", href: "/agent/qr-providers", icon: QrCode },
        { label: "Wallet & Commission", href: "/agent/wallet", icon: Wallet },
        { label: "Transactions", href: "/agent/transactions", icon: Receipt },
        { label: "Agent Profile", href: "/agent/profile", icon: User },
      ],
    },
  };

  const portalConfig = navItemsMap[portal];
  const isActiveNavItem = (href: string) => {
    // A portal's dashboard only owns its exact root URL. Other navigation
    // sections can remain active for their nested detail/create pages.
    const isPortalDashboard = href === `/${portal}`;
    return pathname === href || (!isPortalDashboard && href !== "/" && pathname.startsWith(href + "/"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#e4e6eb] text-[#050505] sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0866ff] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            MP
          </div>
          <div>
            <span className="font-bold text-sm text-[#050505]">Mahadev Portal</span>
            <span className="text-[10px] block text-[#65676b] font-medium">{portalConfig.brand}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(portal === "qr-provider" || portal === "operator") && (
            <Link
              href={portal === "operator" ? "/operator/available-orders" : "/qr-provider/available-orders"}
              className="relative p-2 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] flex items-center justify-center transition"
              title={`${qrAvailableCount} Available Withdrawal Orders`}
            >
              <Bell className={`w-4 h-4 ${qrAvailableCount > 0 ? "text-[#0866ff] animate-bounce" : "text-[#65676b]"}`} />
              {qrAvailableCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#e41e3f] text-[9px] font-extrabold text-white ring-2 ring-white">
                  {qrAvailableCount}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#050505]" /> : <Menu className="w-5 h-5 text-[#050505]" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-white p-5 flex flex-col justify-between shadow-2xl border-r border-[#e4e6eb] text-[#050505]"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e4e6eb] mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0866ff] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    MP
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#050505]">Mahadev Portal</span>
                    <span className="text-[10px] block text-[#65676b] font-medium uppercase tracking-wider">{portalConfig.brand}</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                {portalConfig.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveNavItem(item.href);
                  const isAvailableOrdersItem = item.href.endsWith("/available-orders");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${isActive
                          ? "bg-[#e7f3ff] text-[#0866ff]"
                          : "text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505]"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#0866ff]" : "text-[#65676b]"}`} />
                        <span>{item.label}</span>
                      </div>
                      {isAvailableOrdersItem && qrAvailableCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#e41e3f] text-white text-[9px] font-extrabold animate-pulse">
                          {qrAvailableCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Details & Logout */}
            <div className="pt-4 border-t border-[#e4e6eb] space-y-3">
              <div className="text-xs">
                <div className="font-bold text-[#050505]">{user?.name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#e7f3ff] text-[#0866ff] border border-[#cbe5ff] font-bold uppercase">
                    {user?.role}
                  </span>
                  {user?.portalAccess === false && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase">
                      Read-Only
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-2 px-3 text-xs font-semibold text-[#e41e3f] bg-[#ffebe8] hover:bg-[#ffd0c9] border border-[#ffd0c9] rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar - Refined Slate & Ocean Blue */}
      <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 text-slate-200 flex-col justify-between sticky top-0 h-screen p-4 border-r border-slate-800/80">
        <div>
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800 mb-4 cursor-default select-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-white/10">
              MP
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">Mahadev Portal</span>
              <span className="text-[10px] block text-sky-400 font-semibold tracking-wider uppercase mt-0.5">{portalConfig.brand}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {portalConfig.items.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveNavItem(item.href);
              const isAvailableOrdersItem = item.href.endsWith("/available-orders");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/25 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-sky-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {isAvailableOrdersItem && qrAvailableCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold animate-pulse">
                        {qrAvailableCount}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-400" />}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Session Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800/80">
            <div className="font-semibold text-xs text-white truncate flex items-center justify-between gap-1.5">
              <span className="truncate">{user?.name}</span>
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold uppercase border border-sky-500/30">
                {user?.role}
              </span>
            </div>
            {user?.portalAccess === false && (
              <div className="mt-1.5">
                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold uppercase border border-amber-500/30">
                  Read-Only Mode
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-2 px-3 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 rounded-xl flex items-center justify-center space-x-2 transition border border-rose-800/50 hover:text-white cursor-pointer active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Read-Only Mode Banner */}
        {user && user.role !== "ADMIN" && user.portalAccess === false && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2.5 flex items-center justify-between text-amber-900 text-xs font-medium sticky top-0 z-30 backdrop-blur-md shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-bold">Read-Only Mode:</span>
              <span>Portal access is in read-only mode. You can view all records and data, but Create, Update, and Delete operations are disabled.</span>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Read-Only
            </span>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="bg-white/90 border-b border-slate-200/90 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur-md shadow-2xs">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-normal">{subtitle}</p>}
          </div>
          {(actions || action) && <div className="flex items-center gap-2">{actions || action}</div>}
        </div>

        {/* Child Page Content */}
        <div className="p-4 sm:p-8 w-full mx-auto space-y-6 relative z-20">
          {children}
        </div>
      </main>

      {/* Sign Out Confirmation Modal */}
      {showLogoutConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
              {/* Header */}
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

              {/* User Account Context */}
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
                You will need to enter your credentials to access the portal again.
              </p>

              {/* Action Buttons */}
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

      {/* Real-time Toast Notifications */}
      <RealtimeNotificationBanner portal={portal} userId={user?.id} />
    </div>
  );
}
