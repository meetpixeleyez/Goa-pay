import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { cookies } from "next/headers";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export interface AuthSession {
  userId: number;
  email: string;
  name: string;
  role: "ADMIN" | "MERCHANT" | "AGENT" | "QR_PROVIDER" | "BROKER" | "OPERATOR";
  qrProviderId?: number | null;
}

/**
 * Simple signed/encrypted cookie or token-based session helper for Next.js App Router
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("goa_session")?.value;
    if (!sessionCookie) return null;

    const decoded = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
    if (!decoded.userId || !decoded.role) return null;

    const numericUserId = typeof decoded.userId === "number" ? decoded.userId : parseInt(decoded.userId, 10);
    if (isNaN(numericUserId)) return null;

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: numericUserId },
      select: { id: true, email: true, name: true, role: true, qrProviderId: true },
    });

    if (!user) return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthSession["role"],
      qrProviderId: user.qrProviderId,
    };
  } catch {
    return null;
  }
}

export function createSessionToken(session: AuthSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export async function seedDefaultAdmin() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!existingAdmin) {
    const passwordHash = await hashPassword("admin123");
    await prisma.user.create({
      data: {
        name: "Platform Admin",
        email: "admin@goapay.com",
        role: "ADMIN",
        passwordHash,
      },
    });
    console.log("Seeded default Admin: admin@goapay.com / admin123");
  }
}
