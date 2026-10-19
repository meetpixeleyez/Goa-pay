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
} from "lucide-react";
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

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push("/login");
  };

  const navItemsMap: Record<string, { brand: string; items: NavItem[] }> = {
    admin: {
      brand: "Admin Portal",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Create User", href: "/admin/users/create", icon: UserPlus },
        { label: "Merchants", href: "/admin/merchants", icon: Store },
        { label: "Brokers", href: "/admin/brokers", icon: Briefcase },
        { label: "QR Providers", href: "/admin/qr-providers", icon: QrCode },
        { label: "Operators", href: "/admin/operators", icon: UserCheck },
        { label: "Agents", href: "/admin/agents", icon: Users },
        // { label: "Global Orders", href: "/admin/orders", icon: ShoppingBag },
        // { label: "Wallets & Ledger", href: "/admin/transactions", icon: Wallet },
        // { label: "Platform Settings", href: "/admin/settings", icon: Settings },
      ],
    },
    merchant: {
      brand: "Merchant Portal",
      items: [
        { label: "Dashboard", href: "/merchant", icon: LayoutDashboard },
        // { label: "Orders", href: "/merchant/orders", icon: ShoppingBag },
        // { label: "Create Deposit Link", href: "/merchant/create-order", icon: PlusCircle },
        // { label: "Wallet & Ledger", href: "/merchant/wallet", icon: Wallet },
        { label: "Transactions", href: "/merchant/transactions", icon: Receipt },
        // { label: "API Settings", href: "/merchant/api-settings", icon: KeyRound },
        // { label: "Integration Docs", href: "/merchant/docs", icon: BookOpen },
        { label: "Profile & Settings", href: "/merchant/profile", icon: User },
      ],
    },
    "qr-provider": {
      brand: "QR Provider Portal",
      items: [
        { label: "Dashboard", href: "/qr-provider", icon: LayoutDashboard },
        // { label: "Assigned Orders", href: "/qr-provider/orders", icon: ShoppingBag },
        // { label: "Available Orders", href: "/qr-provider/available-orders", icon: UserCheck },
        { label: "Collection QR Codes", href: "/qr-provider/qr-codes", icon: QrCode },
        { label: "Operators", href: "/qr-provider/operators", icon: Users },
        // { label: "Wallet & Fees", href: "/qr-provider/wallet", icon: Wallet },
        // { label: "Transactions", href: "/qr-provider/transactions", icon: Receipt },
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
                  const isActive = pathname === item.href;
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
                <div className="text-[#65676b] text-[11px] truncate">{user?.email}</div>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#e7f3ff] text-[#0866ff] border border-[#cbe5ff] font-bold uppercase">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 text-xs font-semibold text-[#e41e3f] bg-[#ffebe8] hover:bg-[#ffd0c9] border border-[#ffd0c9] rounded-xl flex items-center justify-center space-x-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar - Facebook Light & Clean */}
      <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 text-slate-200 flex-col justify-between sticky top-0 h-screen p-4">
        <div>
          {/* Logo & Portal Identity */}
          <Link href="/" className="flex items-center space-x-3 pb-4 border-b border-slate-700 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base shadow-sm">
              MP
            </div>
            <div>
              <span className="font-semibold text-base text-slate-200 tracking-tight">Mahadev Portal</span>
              <span className="text-[11px] block text-slate-300/75 font-medium">{portalConfig.brand}</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {portalConfig.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isAvailableOrdersItem = item.href.endsWith("/available-orders");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition ${isActive
                      ? "bg-slate-800 text-slate-50"
                      : "text-slate-300/75 hover:text-slate-200"
                    }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-slate-50" : "text-slate-300/75 group-hover:text-current"}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {isAvailableOrdersItem && qrAvailableCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#e41e3f] text-white text-[9px] font-extrabold animate-pulse">
                        {qrAvailableCount}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-50" />}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Session Footer */}
        <div className="pt-4 border-t border-slate-700 space-y-3">
          <div className="text-xs">
            <div>
              <div className="font-semibold text-slate-200 truncate flex items-center gap-2 mb-1">
                {user?.name}
                <span className="inline-block text-[10px] px-1.5 py-[2px] rounded-full bg-primary text-primary-50 font-semibold uppercase">
                  {user?.role}
                </span>
              </div>
              <div className="text-[12px] text-slate-300/75 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 text-xs font-semibold text-red-50 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center space-x-2 transition border border-red-500"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <div className="bg-white/80 border-b border-[#e4e6eb] px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#050505] tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-[#65676b] mt-0.5">{subtitle}</p>}
          </div>
          {(actions || action) && <div className="flex items-center gap-2">{actions || action}</div>}
        </div>

        {/* Child Page Content */}
        <div className="p-4 sm:p-8 w-full mx-auto space-y-6">
          {children}
        </div>
      </main>

      {/* Real-time Toast Notifications */}
      <RealtimeNotificationBanner portal={portal} userId={user?.id} />
    </div>
  );
}
