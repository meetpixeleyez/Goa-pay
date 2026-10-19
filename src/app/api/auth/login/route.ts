import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanInput = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanInput },
          { email: cleanInput.includes("@") ? cleanInput : `${cleanInput}@goapay.internal` },
          { email: cleanInput.includes("@") ? cleanInput : `${cleanInput}@goapay.com` },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
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

    // Check portal access permission
    if (user.portalAccess === false) {
      return NextResponse.json(
        { error: "Portal access has been disabled for your account. Please contact administrator." },
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

    // Determine redirect path
    let redirectUrl = "/";
    if (user.role === "ADMIN") redirectUrl = "/admin";
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
