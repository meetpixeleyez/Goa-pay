"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

let globalSocket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client instance
 */
export function getSocketClient(): Socket {
  if (!globalSocket && typeof window !== "undefined") {
    globalSocket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket as Socket;
}

/**
 * Play a gentle web audio chime for real-time order arrival notifications
 */
export function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // Ignore audio autoplay restrictions gracefully
  }
}

interface UseSocketOptions {
  role?: "ADMIN" | "MERCHANT" | "QR_PROVIDER" | "AGENT" | "BROKER" | "OPERATOR";
  userId?: string;
  orderId?: number | string;
}

export function useSocket(options?: UseSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = getSocketClient();
    socketRef.current = socket;

    function onConnect() {
      setIsConnected(true);
      if (options?.role || options?.userId) {
        socket.emit("join", { role: options.role, userId: options.userId });
      }
      if (options?.orderId) {
        socket.emit("subscribe:order", options.orderId);
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    if (socket.connected) {
      onConnect();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      if (options?.orderId) {
        socket.emit("unsubscribe:order", options.orderId);
      }
    };
  }, [options?.role, options?.userId, options?.orderId]);

  return {
    socket: socketRef.current,
    isConnected,
    lastNotification,
    setLastNotification,
  };
}
