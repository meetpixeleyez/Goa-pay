import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { requireAuth, handleApiError, requireWritePermission } from "@/server/common/auth-guard";
import { OperatorService } from "@/server/services/operator.service";
import { ApiError } from "@/types/api";

/**
 * Calculates the next sequence number for a given role series (e.g. Operator 1, Operator 2... / Other 1, Other 2...)
 */
async function getNextSequence(role: "OPERATOR" | "OTHER"): Promise<{
  sequence: number;
  username: string;
  email: string;
}> {
  const users = await prisma.user.findMany({
    where: { role },
    select: { name: true, email: true },
  });

  const prefix = role === "OPERATOR" ? "Operator" : "Other";
  const regex = role === "OPERATOR" ? /^operator[\s_]*(\d+)$/i : /^other[\s_]*(\d+)$/i;

  let maxNum = 0;
  for (const u of users) {
    if (u.name) {
      const match = u.name.trim().match(regex);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    }
    if (u.email) {
      const emailUsername = u.email.split("@")[0];
      const match = emailUsername.match(regex);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) maxNum = val;
      }
    }
  }

  let nextNum = maxNum + 1;

  // Double check that no user exists with this exact username or email
  while (true) {
    const candidateName = `${prefix} ${nextNum}`;
    const candidateEmail = `${prefix.toLowerCase()}_${nextNum}@goapay.internal`;
    const candidateSlug = `${prefix.toLowerCase()}_${nextNum}`;

    const exists = await prisma.user.findFirst({
      where: {
        OR: [
          { name: candidateName },
          { email: candidateEmail },
          { email: `${candidateSlug}@goapay.internal` },
        ],
      },
      select: { id: true },
    });

    if (!exists) {
      return {
        sequence: nextNum,
        username: candidateName,
        email: candidateEmail,
      };
    }
    nextNum++;
  }
}

/**
 * Generates an auto-generated password for the series
 * e.g. "Op@748291" for Operator or "Ot@918234" for Other
 */
function generateSeriesPassword(role: "OPERATOR" | "OTHER"): string {
  const prefix = role === "OPERATOR" ? "Op@" : "Ot@";
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomDigits}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role")?.toUpperCase();

    if (roleParam !== "OPERATOR" && roleParam !== "OTHER") {
      return NextResponse.json(
        { error: "Invalid role. Supported roles are OPERATOR and OTHER." },
        { status: 400 }
      );
    }

    const role = roleParam as "OPERATOR" | "OTHER";

    // Permission check
    if (role === "OTHER" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied. Only admin can provision Other role." }, { status: 403 });
    }

    if (role === "OPERATOR" && session.role !== "ADMIN" && session.role !== "QR_PROVIDER") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { sequence, username, email } = await getNextSequence(role);
    const suggestedPassword = generateSeriesPassword(role);

    // If Operator and Admin, load available QR Providers
    let qrProviders: any[] = [];
    if (role === "OPERATOR" && session.role === "ADMIN") {
      qrProviders = await prisma.user.findMany({
        where: { role: "QR_PROVIDER", status: "ACTIVE" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({
      success: true,
      role,
      sequence,
      username,
      email,
      suggestedPassword,
      qrProviders,
      userRole: session.role,
      providerId: session.role === "QR_PROVIDER" ? session.userId : null,
      providerName: session.role === "QR_PROVIDER" ? session.name : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requireWritePermission(session);

    const body = await request.json().catch(() => ({}));
    const roleParam = body.role?.toUpperCase();

    if (roleParam !== "OPERATOR" && roleParam !== "OTHER") {
      return NextResponse.json(
        { error: "Invalid role. Supported roles are OPERATOR and OTHER." },
        { status: 400 }
      );
    }

    const role = roleParam as "OPERATOR" | "OTHER";

    if (role === "OTHER" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied. Only Admin can create Other role." }, { status: 403 });
    }

    if (role === "OPERATOR" && session.role !== "ADMIN" && session.role !== "QR_PROVIDER") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Determine Username and Password
    const seqData = await getNextSequence(role);
    const finalUsername = (body.username || seqData.username).trim();
    const finalPassword = (body.password || generateSeriesPassword(role)).trim();

    if (finalPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    // OPERATOR CREATION FLOW
    if (role === "OPERATOR") {
      let targetProviderId = session.role === "QR_PROVIDER" ? session.userId : body.qrProviderId;
      if (typeof targetProviderId === "string") targetProviderId = parseInt(targetProviderId, 10);

      if (!targetProviderId) {
        // If admin and only 1 active provider in system, pick it as default
        if (session.role === "ADMIN") {
          const firstProvider = await prisma.user.findFirst({
            where: { role: "QR_PROVIDER", status: "ACTIVE" },
            select: { id: true },
          });
          if (firstProvider) {
            targetProviderId = firstProvider.id;
          }
        }
      }

      if (!targetProviderId) {
        return NextResponse.json(
          { error: "A parent QR Provider is required to create an Operator account." },
          { status: 400 }
        );
      }

      const operator = await OperatorService.createOperator(
        {
          name: finalUsername,
          password: finalPassword,
          qrProviderId: targetProviderId,
        },
        session
      );

      return NextResponse.json({
        success: true,
        message: `Operator "${finalUsername}" created successfully!`,
        user: operator,
        credentials: {
          username: finalUsername,
          password: finalPassword,
          role: "OPERATOR",
          loginUrl: "/login",
        },
      });
    }

    // OTHER ROLE CREATION FLOW
    if (role === "OTHER") {
      const cleanSlug = finalUsername.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
      const finalEmail = `${cleanSlug}@goapay.internal`;

      // Check if user exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: finalEmail },
            { name: finalUsername },
          ],
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `User with username "${finalUsername}" already exists.` },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(finalPassword);

      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            role: "OTHER",
            name: finalUsername,
            email: finalEmail,
            passwordHash,
            status: "ACTIVE",
            portalAccess: true,
            transactionAllowed: true,
            commissionPercent: 0,
          },
        });

        // Initialize empty wallet
        await tx.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
          },
        });

        return user;
      });

      return NextResponse.json({
        success: true,
        message: `User "${finalUsername}" created successfully!`,
        user: newUser,
        credentials: {
          username: finalUsername,
          password: finalPassword,
          role: "OTHER",
          loginUrl: "/login",
        },
      });
    }

    return NextResponse.json({ error: "Unsupported role." }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
