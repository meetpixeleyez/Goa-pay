import type { Server as SocketIOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __socketIO: SocketIOServer | undefined;
}

/**
 * Register global Socket.IO instance attached to the custom Next.js HTTP server
 */
export function setIO(io: SocketIOServer) {
  globalThis.__socketIO = io;
}

/**
 * Access the global Socket.IO instance
 */
export function getIO(): SocketIOServer | null {
  return globalThis.__socketIO || null;
}

/**
 * Setup event listeners and room joining on socket connection
 */
export function setupSocketListeners(io: SocketIOServer) {
  io.on("connection", (socket) => {
    // Client authentication and room joining
    socket.on("join", (data: { role?: string; userId?: string }) => {
      if (data?.role) {
        socket.join(`role:${data.role}`);
      }
      if (data?.userId) {
        socket.join(`user:${data.userId}`);
      }
      socket.emit("joined", { success: true, socketId: socket.id });
    });

    socket.on("subscribe:order", (orderId: number | string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("unsubscribe:order", (orderId: number | string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });
}

/**
 * Notify all QR Providers and Admins that a new withdrawal order is available in the pool
 */
export function notifyPayoutAvailable(order: any) {
  const io = getIO();
  if (!io) return;

  const payload = {
    order,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    customerName: order.customerName,
    beneficiaryDetails: order.beneficiaryDetails,
    customerUpiId: order.customerUpiId,
    customerQrImage: order.customerQrImage,
    message: `New withdrawal order available: ₹${order.amount.toFixed(2)} (#${order.orderNumber})`,
    timestamp: new Date().toISOString(),
  };

  io.to("role:QR_PROVIDER").to("role:ADMIN").to("role:OPERATOR").emit("payout:available", payload);
  io.emit("stats:update");
}

/**
 * Notify that an order was claimed by a QR provider so all other QR providers
 * instantly remove it from their available orders list in real-time.
 */
export function notifyPayoutClaimed(orderId: number, qrProviderId: string, qrProviderName?: string) {
  const io = getIO();
  if (!io) return;

  const payload = {
    orderId,
    qrProviderId,
    qrProviderName,
    message: `Order #${orderId} was accepted by a QR provider`,
    timestamp: new Date().toISOString(),
  };

  io.emit("payout:claimed", payload);
  io.to(`order:${orderId}`).emit("order:updated", { orderId, status: "processing", qrProviderId });
  io.emit("stats:update");
}

/**
 * Notify Admin (and Merchant) that payment proof & UTR have been uploaded by QR Provider
 */
export function notifyPayoutSubmitted(order: any) {
  const io = getIO();
  if (!io) return;

  const payload = {
    order,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    utr: order.payoutProofUtr,
    proofImage: order.payoutProofImage,
    qrProviderId: order.qrProviderId,
    message: `QR Provider submitted proof for withdrawal #${order.orderNumber} (UTR: ${order.payoutProofUtr})`,
    timestamp: new Date().toISOString(),
  };

  io.to("role:ADMIN").emit("payout:submitted", payload);
  if (order.merchantId) {
    io.to(`user:${order.merchantId}`).emit("payout:submitted", payload);
  }
  io.to(`order:${order.id}`).emit("order:updated", { orderId: order.id, status: "submitted", order });
}

/**
 * Notify QR Provider, Merchant, and Admin that the order has been verified and settled
 */
export function notifyPayoutCompleted(order: any) {
  const io = getIO();
  if (!io) return;

  const payload = {
    order,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    paidBy: order.payoutPaidBy,
    message: `Withdrawal order #${order.orderNumber} settled & completed`,
    timestamp: new Date().toISOString(),
  };

  io.emit("payout:completed", payload);
  io.to(`order:${order.id}`).emit("order:updated", { orderId: order.id, status: "completed", order });
  io.to("role:ADMIN").to("role:QR_PROVIDER").to("role:MERCHANT").to("role:AGENT").to("role:OPERATOR").emit("order:updated", {
    orderId: order.id,
    status: "completed",
    order,
  });
  if (order.merchantId) {
    io.to(`user:${order.merchantId}`).emit("order:updated", { orderId: order.id, status: "completed", order });
  }
  if (order.qrProviderId) {
    io.to(`user:${order.qrProviderId}`).emit("order:updated", { orderId: order.id, status: "completed", order });
  }
  io.emit("stats:update");
}

/**
 * Notify that an order was released back to the pool by QR Provider
 */
export function notifyPayoutReleased(order: any, providerName?: string) {
  const io = getIO();
  if (!io) return;

  const payload = {
    order,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    providerName,
    message: providerName
      ? `Withdrawal order #${order.orderNumber} was cancelled by QR Provider '${providerName}' and returned to pool`
      : `Withdrawal order #${order.orderNumber} released back to available pool`,
    timestamp: new Date().toISOString(),
  };

  io.to("role:ADMIN").emit("payout:provider_cancelled", payload);
  io.to("role:QR_PROVIDER").to("role:ADMIN").to("role:OPERATOR").emit("payout:released", payload);
  io.to(`order:${order.id}`).emit("order:updated", { orderId: order.id, status: "pending", qrProviderId: null, order });
  io.emit("stats:update");
}

/**
 * Notify QR Provider and Operator that a new deposit (PAYIN) order was created and assigned
 */
export function notifyPayinAssigned(order: any) {
  const io = getIO();
  if (!io) return;

  const operatorId = order.qrCode?.operatorId || null;

  const payload = {
    order,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    qrProviderId: order.qrProviderId,
    operatorId: operatorId,
    status: order.status,
    title: "New Deposit Order Assigned!",
    message: `Deposit order #${order.orderNumber} (₹${order.amount.toFixed(2)}) assigned to you. Please accept it.`,
    timestamp: new Date().toISOString(),
  };

  // Deliver to assigned QR Provider, assigned Operator, and Admin rooms with deduplication
  const targetRooms: string[] = ["role:ADMIN"];
  if (order.qrProviderId) {
    targetRooms.push(`user:${order.qrProviderId}`);
  }
  if (operatorId) {
    targetRooms.push(`user:${operatorId}`);
  }

  // Chaining rooms in a single emit guarantees Socket.IO sends the event only once per socket
  let emitter = io.to(targetRooms[0]);
  for (let i = 1; i < targetRooms.length; i++) {
    emitter = emitter.to(targetRooms[i]);
  }
  // Emit SINGLE event
  emitter.emit("order:assigned", payload);

  // Update order subscribers and portal stats
  io.to(`order:${order.id}`).emit("order:updated", payload);
  io.emit("stats:update");
}

/**
 * Notify that an order was cancelled
 */
export function notifyPayoutCancelled(orderId: number, orderNumber?: string) {
  const io = getIO();
  if (!io) return;

  const payload = {
    orderId,
    orderNumber,
    message: `Withdrawal order #${orderNumber || orderId} was cancelled`,
    timestamp: new Date().toISOString(),
  };

  io.emit("payout:cancelled", payload);
  io.to(`order:${orderId}`).emit("order:updated", { orderId, status: "rejected" });
  io.emit("stats:update");
}

/**
 * General order update notification (e.g. customer QR/UPI updated)
 */
export function notifyOrderUpdated(order: any) {
  const io = getIO();
  if (!io) return;

  const payload = {
    order,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerUpiId: order.customerUpiId,
    customerQrImage: order.customerQrImage,
    beneficiaryDetails: order.beneficiaryDetails,
    timestamp: new Date().toISOString(),
  };

  io.to(`order:${order.id}`).emit("order:updated", payload);
  io.to("role:ADMIN").to("role:QR_PROVIDER").to("role:OPERATOR").emit("order:updated", payload);
}
