"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { getSocketClient, playNotificationChime } from "@/lib/socket-client";

interface RealtimeNotificationBannerProps {
  portal: "admin" | "qr-provider" | "merchant" | "agent" | "operator";
  userId?: string;
  onOrderAction?: (orderId: number) => void;
}

export interface NotificationItem {
  id: string;
  type: "payout_available" | "payout_claimed" | "payout_submitted" | "payout_completed" | "payin_assigned" | "general";
  title: string;
  message: string;
  orderId?: number;
  orderNumber?: string;
  amount?: number;
  link?: string;
  buttonText?: string;
  timestamp: string;
}

export default function RealtimeNotificationBanner({
  portal,
  userId,
  onOrderAction,
}: RealtimeNotificationBannerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const socket = getSocketClient();
    if (!socket) return;

    const handlePayinAssigned = (data: any) => {
      if (portal === "qr-provider" || portal === "operator" || portal === "admin") {
        // Targeted validation if userId is supplied
        if (userId) {
          if (portal === "qr-provider" && data.qrProviderId && data.qrProviderId !== userId) {
            return;
          }
          if (portal === "operator" && data.operatorId && data.operatorId !== userId) {
            return;
          }
        }

        playNotificationChime();

        const amt = Number(data.amount || data.order?.amount || 0);
        const orderNum = data.orderNumber || data.order?.orderNumber || data.orderId;

        const defaultMsg =
          portal === "admin"
            ? `Deposit order #${orderNum} (₹${amt.toFixed(2)}) assigned to QR Provider & Operator.`
            : `Deposit order #${orderNum} (₹${amt.toFixed(2)}) assigned to you. Please accept it.`;

        const item: NotificationItem = {
          id: `payin-${data.orderId || data.order?.id || Date.now()}-${Date.now()}`,
          type: "payin_assigned",
          title: data.title || "New Deposit Order Assigned!",
          message: data.message || defaultMsg,
          orderId: data.orderId || data.order?.id,
          orderNumber: orderNum,
          amount: amt,
          link:
            portal === "operator"
              ? "/operator/orders"
              : portal === "qr-provider"
              ? "/qr-provider/orders"
              : "/admin/orders",
          buttonText: portal === "admin" ? "View Details" : "Accept & View",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        // Maintain exactly one active notification popup at a time
        setNotifications([item]);
      }
    };

    const handlePayoutAvailable = (data: any) => {
      if (portal === "qr-provider" || portal === "admin" || portal === "operator") {
        playNotificationChime();
        const item: NotificationItem = {
          id: `avail-${data.orderId}-${Date.now()}`,
          type: "payout_available",
          title: "New Withdrawal Order Available!",
          message: `Disbursement of ₹${Number(data.amount).toFixed(2)} is ready to be claimed`,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          amount: data.amount,
          link: portal === "operator" ? "/operator/available-orders" : portal === "qr-provider" ? "/qr-provider/available-orders" : "/admin/orders",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setNotifications([item]);
      }
    };

    const handlePayoutClaimed = (data: any) => {
      if (portal === "admin") {
        const item: NotificationItem = {
          id: `claim-${data.orderId}-${Date.now()}`,
          type: "payout_claimed",
          title: "Order Accepted by QR Provider",
          message: `Order #${data.orderId} accepted. 5-minute fulfillment countdown started.`,
          orderId: data.orderId,
          link: "/admin/orders",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setNotifications([item]);
      }
    };

    const handlePayoutSubmitted = (data: any) => {
      if (portal === "admin") {
        playNotificationChime();
        const item: NotificationItem = {
          id: `submit-${data.orderId}-${Date.now()}`,
          type: "payout_submitted",
          title: "Payment Proof Submitted!",
          message: `QR Provider transferred ₹${Number(data.amount).toFixed(2)} (UTR: ${data.utr}). Ready for settlement.`,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          amount: data.amount,
          link: "/admin/orders",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setNotifications([item]);
      }
    };

    const handlePayoutCompleted = (data: any) => {
      const item: NotificationItem = {
        id: `comp-${data.orderId}-${Date.now()}`,
        type: "payout_completed",
        title: "Withdrawal Settled Successfully",
        message: `Order #${data.orderNumber} settled & credited.`,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setNotifications([item]);
    };

    const handleProviderCancelled = (data: any) => {
      if (portal === "admin") {
        const item: NotificationItem = {
          id: `canc-${data.orderId}-${Date.now()}`,
          type: "payout_available",
          title: "Order Cancelled by QR Provider!",
          message: data.providerName
            ? `Withdrawal #${data.orderNumber} (₹${Number(data.amount || 0).toFixed(2)}) was cancelled by ${data.providerName}.`
            : `Withdrawal #${data.orderNumber} was cancelled by QR Provider and returned to pool.`,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          amount: data.amount,
          link: "/admin/orders",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setNotifications([item]);
      }
    };

    socket.on("payout:available", handlePayoutAvailable);
    socket.on("payout:claimed", handlePayoutClaimed);
    socket.on("payout:submitted", handlePayoutSubmitted);
    socket.on("payout:completed", handlePayoutCompleted);
    socket.on("payout:provider_cancelled", handleProviderCancelled);
    socket.on("order:assigned", handlePayinAssigned);

    return () => {
      socket.off("payout:available", handlePayoutAvailable);
      socket.off("payout:claimed", handlePayoutClaimed);
      socket.off("payout:submitted", handlePayoutSubmitted);
      socket.off("payout:completed", handlePayoutCompleted);
      socket.off("payout:provider_cancelled", handleProviderCancelled);
      socket.off("order:assigned", handlePayinAssigned);
    };
  }, [portal, userId]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto bg-white/95 backdrop-blur-md border-2 rounded-2xl p-3.5 shadow-xl transition transform animate-slideIn flex items-start space-x-3 ${
            n.type === "payin_assigned"
              ? "border-emerald-500 shadow-emerald-500/10"
              : "border-sky-400"
          }`}
        >
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              n.type === "payout_available"
                ? "bg-sky-100 text-sky-800"
                : n.type === "payout_submitted"
                ? "bg-blue-100 text-blue-800 animate-pulse"
                : n.type === "payin_assigned"
                ? "bg-emerald-100 text-emerald-800 animate-bounce"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {n.type === "payout_available" ? (
              <Bell className="w-4 h-4 text-sky-700" />
            ) : n.type === "payout_submitted" ? (
              <ArrowUpRight className="w-4 h-4 text-blue-700" />
            ) : n.type === "payin_assigned" ? (
              <ArrowDownLeft className="w-4 h-4 text-emerald-700 font-bold" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base-900 truncate">{n.title}</span>
              <span className="text-[10px] text-gray-400 font-mono">{n.timestamp}</span>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{n.message}</p>

            {n.link && (
              <div className="mt-2 flex items-center space-x-2">
                <Link
                  href={n.link}
                  onClick={() => removeNotification(n.id)}
                  className={`px-2.5 py-1 text-white font-bold rounded-lg text-[10px] inline-flex items-center space-x-1 shadow-xs transition ${
                    n.type === "payin_assigned"
                      ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300"
                      : "bg-sky-600 hover:bg-sky-700"
                  }`}
                >
                  <span>{n.buttonText || "View Details"}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => removeNotification(n.id)}
                  className="text-[10px] text-slate-500 hover:text-gray-800 font-semibold px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => removeNotification(n.id)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
