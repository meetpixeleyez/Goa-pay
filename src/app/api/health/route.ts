import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getIO } from "@/lib/socket-server";

// Force dynamic execution for health check
export const dynamic = "force-dynamic";

interface ServiceStatus {
  status: "healthy" | "unhealthy" | "not_initialized";
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

export async function GET() {
  const startTime = Date.now();
  let dbStatus: ServiceStatus = { status: "unhealthy" };
  let overallHealthy = true;

  // 1. Check Database connection & latency
  const dbStart = Date.now();
  try {
    // Ping SQLite database using raw query
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    dbStatus = {
      status: "healthy",
      latencyMs: dbLatency,
      message: "Database connection active",
    };
  } catch (error: any) {
    overallHealthy = false;
    dbStatus = {
      status: "unhealthy",
      latencyMs: Date.now() - dbStart,
      message: error?.message || "Database connection failed",
    };
  }

  // 2. Check Socket.IO engine status
  const io = getIO();
  const socketStatus: ServiceStatus = io
    ? {
        status: "healthy",
        message: "Real-time engine running",
        details: {
          connectedSockets: io.sockets?.sockets?.size ?? 0,
        },
      }
    : {
        status: "not_initialized",
        message: "Socket engine not yet initialized or running via standalone Next.js worker",
      };

  // 3. System Memory Usage
  const memoryUsage = process.memoryUsage();
  const memoryInfo = {
    rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
    heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
  };

  // 4. System Uptime
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

  const totalDurationMs = Date.now() - startTime;

  const payload = {
    status: overallHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: uptimeFormatted,
    },
    services: {
      database: dbStatus,
      socket: socketStatus,
    },
    system: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "development",
      memory: memoryInfo,
      responseTimeMs: totalDurationMs,
    },
  };

  const statusCode = overallHealthy ? 200 : 503;

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  }
}
