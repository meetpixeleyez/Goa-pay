import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { normalizeIndianPhone } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const emailOrUsername = (body.username || body.email || "").trim();
    const password = body.password;
    const clientDeviceId = body.deviceId?.trim();

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Username/Email and password are required" },
        { status: 400 }
      );
    }

    const cleanInput = emailOrUsername.toLowerCase();
    const cleanSlug = cleanInput.replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
    const cleanPhone = normalizeIndianPhone(cleanInput);

    const candidateUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: cleanInput },
          { email: cleanInput.includes("@") ? cleanInput : `${cleanInput}@goapay.internal` },
          { email: cleanSlug ? `${cleanSlug}@goapay.internal` : cleanInput },
          { email: cleanSlug ? { contains: cleanSlug } : cleanInput },
          { email: cleanInput.includes("@") ? cleanInput : `${cleanInput}@goapay.com` },
          { name: { equals: emailOrUsername } },
          { name: { equals: cleanSlug } },
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ],
      },
    });

    if (!candidateUsers || candidateUsers.length === 0) {
      return NextResponse.json(
        { error: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    let user: any = null;
    for (const candidate of candidateUsers) {
      const isMatch = await verifyPassword(password, candidate.passwordHash);
      if (isMatch) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === "INACTIVE") {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact administrator." },
        { status: 403 }
      );
    }

    // If operator, check parent QR provider status
    if (user.role === "OPERATOR") {
      if (!user.qrProviderId) {
        return NextResponse.json(
          { error: "Operator account is not associated with any QR Provider." },
          { status: 403 }
        );
      }
      const parentProvider = await prisma.user.findUnique({
        where: { id: user.qrProviderId },
        select: { status: true, portalAccess: true },
      });
      if (!parentProvider || parentProvider.status === "INACTIVE") {
        return NextResponse.json(
          { error: "Parent QR Provider account is inactive. Please contact your administrator." },
          { status: 403 }
        );
      }
    }

    // Extract client IP, device ID, and location metadata dynamically
    let clientIp = body.clientIp?.trim();
    if (!clientIp || clientIp === "127.0.0.1" || clientIp === "::1") {
      const forwardedFor = request.headers.get("x-forwarded-for");
      clientIp = forwardedFor
        ? forwardedFor.split(",")[0].trim()
        : request.headers.get("x-real-ip") || "";
    }

    let locationInfo = body.location?.trim() || "";
    const userAgent = request.headers.get("user-agent") || "Unknown Device / Browser";

    // If still localhost or empty, dynamically resolve public IP & Geo location
    if (!clientIp || clientIp === "127.0.0.1" || clientIp === "::1" || !locationInfo) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const geoRes = await fetch("https://ipwho.is/", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.success) {
            if (!clientIp || clientIp === "127.0.0.1" || clientIp === "::1") {
              clientIp = geoData.ip;
            }
            if (!locationInfo) {
              locationInfo = `${geoData.city || "Surat"}, ${geoData.region || "Gujarat"}, ${geoData.country || "India"}`.replace(/^, |, $/g, "").trim();
            }
          }
        }
      } catch {
        // Fallback
      }
    }

    if (!clientIp || clientIp === "::1" || clientIp === "127.0.0.1") {
      clientIp = "103.240.194.52";
    }
    if (!locationInfo) {
      locationInfo = "Surat, Gujarat, India";
    }

    const resolvedDeviceId =
      clientDeviceId ||
      request.headers.get("x-device-id")?.trim() ||
      `dev_${Buffer.from(userAgent).toString("base64").substring(0, 16)}`;

    // Audit Logging: If operator logs in, create audit log with IP, deviceId, and location
    if (user.role === "OPERATOR") {
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "OPERATOR_LOGIN",
            entity: "User",
            entityId: String(user.id),
            metadata: JSON.stringify({
              username: user.name,
              email: user.email,
              role: user.role,
              qrProviderId: user.qrProviderId,
              ip: clientIp,
              deviceId: resolvedDeviceId,
              userAgent,
              deviceInfo: body.deviceInfo || "Chrome on Windows",
              location: locationInfo,
              loginAt: new Date().toISOString(),
            }),
          },
        });
      } catch (logErr) {
        console.error("Failed to record operator login audit log:", logErr);
      }
    }

    // Determine redirect path
    let redirectUrl = "/";
    if (user.role === "ADMIN") redirectUrl = "/admin/users";
    else if (user.role === "MERCHANT") redirectUrl = "/merchant";
    else if (user.role === "QR_PROVIDER") redirectUrl = "/qr-provider";
    else if (user.role === "AGENT") redirectUrl = "/agent";
    else if (user.role === "BROKER") redirectUrl = "/admin/brokers";
    else if (user.role === "OPERATOR") redirectUrl = "/operator";

    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      qrProviderId: user.qrProviderId,
      portalAccess: user.portalAccess !== false,
    };

    const token = createSessionToken(sessionData);

    const response = NextResponse.json({
      success: true,
      user: sessionData,
      redirectUrl,
    });

    response.cookies.set("goa_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 500 }
    );
  }
}
