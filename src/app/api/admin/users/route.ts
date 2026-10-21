import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { validateUserData, normalizeIndianPhone, normalizeTelegramId } from "@/lib/validation";
import { MerchantService } from "@/server/services/merchant.service";
import { QRProviderService } from "@/server/services/qr-provider.service";
import { OperatorService } from "@/server/services/operator.service";
import { AgentService } from "@/server/services/agent.service";
import { BrokerService } from "@/server/services/broker.service";
import { handleApiError } from "@/server/common/auth-guard";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const brokerId = searchParams.get("brokerId");
    const agentId = searchParams.get("agentId");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc").toLowerCase() as "asc" | "desc";
    const includeStats = searchParams.get("includeStats") === "true" || role === "MERCHANT" || role === "QR_PROVIDER";

    // Delegate MERCHANT queries to MerchantService
    if (role === "MERCHANT") {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
      const result = await MerchantService.getMerchants({
        search: search || undefined,
        status: status || undefined,
        brokerId: brokerId || undefined,
        sortBy: sortBy as any,
        sortOrder,
        page,
        limit,
        includeStats,
      });

      return NextResponse.json({
        success: true,
        users: result.merchants,
        merchants: result.merchants,
        pagination: result.pagination,
        stats: result.stats,
      });
    }

    // Delegate QR_PROVIDER queries to QRProviderService
    if (role === "QR_PROVIDER") {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
      const result = await QRProviderService.getQRProviders({
        search: search || undefined,
        status: status || undefined,
        agentId: agentId || undefined,
        sortBy: sortBy as any,
        sortOrder,
        page,
        limit,
        includeStats,
      });

      return NextResponse.json({
        success: true,
        users: result.providers,
        providers: result.providers,
        pagination: result.pagination,
        stats: result.stats,
      });
    }

    // Delegate AGENT queries to AgentService
    if (role === "AGENT") {
      const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
      const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
      const result = await AgentService.getAgents(
        {
          search: search || undefined,
          status: status || undefined,
          sortBy: sortBy as any,
          sortOrder,
          page,
          limit,
        },
        session
      );

      return NextResponse.json({
        success: true,
        users: result.agents,
        agents: result.agents,
        pagination: result.pagination,
      });
    }

    // Delegate BROKER queries to BrokerService
    if (role === "BROKER") {
      const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
      const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
      const result = await BrokerService.getBrokers(
        {
          search: search || undefined,
          status: status || undefined,
          sortBy: sortBy as any,
          sortOrder,
          page,
          limit,
        },
        session
      );

      return NextResponse.json({
        success: true,
        users: result.brokers,
        brokers: result.brokers,
        pagination: result.pagination,
      });
    }

    const where: any = {};
    if (role) {
      where.role = role.toUpperCase();
    }
    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }
    if (brokerId) {
      if (brokerId === "NONE" || brokerId === "null") {
        where.brokerId = null;
      } else if (brokerId !== "ALL") {
        where.brokerId = brokerId;
      }
    }
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s } },
        { phone: { contains: s } },
        { telegramId: { contains: s } },
        { id: { contains: s } },
      ];
    }

    // Determine sorting
    let orderBy: any = { createdAt: sortOrder };
    if (sortBy === "name") {
      orderBy = { name: sortOrder };
    } else if (sortBy === "balance") {
      orderBy = { wallet: { balance: sortOrder } };
    } else if (sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    }

    const isPaginated = searchParams.has("page") || searchParams.has("limit") || searchParams.get("paginate") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      include: {
        wallet: true,
        qrCodes: true,
        assignedQRCodes: true,
        qrProvider: { select: { id: true, name: true } },
        broker: { select: { id: true, name: true, commissionPercent: true } },
        agent: { select: { id: true, name: true } },
        operators: { select: { id: true, name: true, status: true } },
        brokeredMerchants: {
          select: {
            id: true,
            name: true,
            status: true,
            payinMerchantFee: true,
            payinQrProviderFee: true,
            payinAgentFee: true,
            payinBrokerFee: true,
            payoutMerchantFee: true,
            payoutQrProviderFee: true,
            payoutAgentFee: true,
            payoutBrokerFee: true,
          },
        },
        _count: {
          select: {
            merchantOrders: true,
            providerOrders: true,
            brokeredMerchants: true,
            agentQrProviders: true,
          },
        },
      },
      orderBy,
      ...(isPaginated ? { skip: (page - 1) * limit, take: limit } : {}),
    });

    let stats = null;
    if (includeStats && role === "MERCHANT") {
      const [totalMerchants, activeMerchants, inactiveMerchants, walletAgg, feeAgg, totalOrders] = await Promise.all([
        prisma.user.count({ where: { role: "MERCHANT" } }),
        prisma.user.count({ where: { role: "MERCHANT", status: "ACTIVE" } }),
        prisma.user.count({ where: { role: "MERCHANT", status: "INACTIVE" } }),
        prisma.wallet.aggregate({ _sum: { balance: true }, where: { user: { role: "MERCHANT" } } }),
        prisma.user.aggregate({ _avg: { payinMerchantFee: true, payoutMerchantFee: true }, where: { role: "MERCHANT" } }),
        prisma.order.count({ where: { merchant: { role: "MERCHANT" } } }),
      ]);

      stats = {
        totalMerchants,
        activeMerchants,
        inactiveMerchants,
        totalWalletBalance: walletAgg._sum.balance || 0,
        avgPayinFee: Number((feeAgg._avg.payinMerchantFee || 0).toFixed(2)),
        avgPayoutFee: Number((feeAgg._avg.payoutMerchantFee || 0).toFixed(2)),
        totalOrders,
      };
    }

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total,
        page: isPaginated ? page : 1,
        limit: isPaginated ? limit : total,
        totalPages: isPaginated ? Math.ceil(total / limit) || 1 : 1,
      },
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();
    let {
      role,
      name,
      email,
      password,
      phone,
      address,
      telegramId,
      status,
      portalAccess,
      transactionAllowed,
      // Merchant specific
      payinMerchantFee,
      payinQrProviderFee,
      payinAgentFee,
      payinBrokerFee,
      payoutMerchantFee,
      payoutQrProviderFee,
      payoutAgentFee,
      payoutBrokerFee,
      brokerId,
      upiId,
      qrCodeUrl,
      // Agent specific
      commissionPercent,
      // QR Provider specific
      balance,
      agentId,
      qrProviderFee,
      initialUpiId,
      initialQrImageUrl,
      accountHolderName,
      bankName,
      // Operator specific
      qrProviderId: rawQrProviderId,
      assignedQrIds,
    } = data;

    const qrProviderId = rawQrProviderId || data.targetProviderId || data.providerId;

    const cleanName = (name || "").trim();
    if (cleanName.includes("@")) {
      return NextResponse.json(
        { error: "Full Name / Username cannot be an email address. Please enter a person's name or username." },
        { status: 400 }
      );
    }

    const baseSlug = cleanName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, "") || "user";

    const roleLabel =
      role === "MERCHANT"
        ? "Merchant"
        : role === "QR_PROVIDER"
        ? "QR Provider"
        : role === "BROKER"
        ? "Broker"
        : role === "AGENT"
        ? "Agent"
        : role === "OPERATOR"
        ? "Operator"
        : role === "OTHER"
        ? "Other"
        : role;

    // Strict check: ONLY throw error if SAME ROLE + SAME USERNAME
    const existingSameRoleUser = await prisma.user.findFirst({
      where: {
        role,
        OR: [
          { name: { equals: cleanName } },
          { name: { equals: baseSlug } },
        ],
      },
    });

    if (existingSameRoleUser) {
      return NextResponse.json(
        { error: `A ${roleLabel} with username "${cleanName}" already exists. Please choose a different username.` },
        { status: 400 }
      );
    }

    data.username = cleanName;

    if (!role || !name || !password) {
      return NextResponse.json(
        { error: "Role, Name, and Password are required" },
        { status: 400 }
      );
    }

    // Delegate MERCHANT creation to MerchantService
    if (role === "MERCHANT") {
      const user = await MerchantService.createMerchant(data, session.userId);
      return NextResponse.json({ success: true, user });
    }

    // Delegate QR_PROVIDER creation to QRProviderService
    if (role === "QR_PROVIDER") {
      const user = await QRProviderService.createQRProvider(
        {
          name: data.name,
          password: data.password,
          phone: data.phone,
          address: data.address,
          telegramId: data.telegramId,
          initialBalance: parseFloat(data.balance) || 0,
          agentId: data.agentId,
          payinQrProviderFee: data.payinQrProviderFee ?? data.qrProviderFee,
          payoutQrProviderFee: data.payoutQrProviderFee ?? data.qrProviderFee,
          payinAgentFee: data.payinAgentFee,
          payoutAgentFee: data.payoutAgentFee,
          initialUpiId: data.initialUpiId,
          initialQrImageUrl: data.initialQrImageUrl,
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
        },
        session.userId
      );
      return NextResponse.json({ success: true, user });
    }

    // Delegate OPERATOR creation to OperatorService
    if (role === "OPERATOR") {
      const assignedQrIds = Array.isArray(data.assignedQrIds)
        ? data.assignedQrIds
        : Array.isArray(data.qrCodeIds)
        ? data.qrCodeIds
        : [];

      const user = await OperatorService.createOperator(
        {
          name: data.name,
          password: data.password,
          phone: data.phone,
          qrProviderId,
          assignedQrIds,
          initialUpiId: data.initialUpiId,
          initialQrImageUrl: data.initialQrImageUrl,
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
        },
        session
      );
      return NextResponse.json({ success: true, user });
    }

    // Delegate AGENT creation to AgentService
    if (role === "AGENT") {
      const user = await AgentService.createAgent(data, session.userId);
      return NextResponse.json({ success: true, user });
    }

    // Delegate BROKER creation to BrokerService
    if (role === "BROKER") {
      const user = await BrokerService.createBroker(data, session.userId);
      return NextResponse.json({ success: true, user });
    }

    // Run comprehensive field validation
    const validation = validateUserData(data, { isCreate: true, role });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 }
      );
    }


    const passwordHash = await hashPassword(password);
    const initialBal = parseFloat(balance) || 0.0;
    const cleanPhone = phone ? normalizeIndianPhone(phone) : null;
    const cleanTelegram = normalizeTelegramId(telegramId);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          role,
          name: name.trim(),
          phone: cleanPhone,
          address: address ? address.trim() : null,
          telegramId: cleanTelegram,
          passwordHash,
          status: status || "ACTIVE",
          portalAccess: portalAccess !== undefined ? Boolean(portalAccess) : true,
          transactionAllowed: transactionAllowed !== undefined ? Boolean(transactionAllowed) : true,
          // Merchant fees (defaulting to 0)
          payinMerchantFee: payinMerchantFee !== undefined ? parseFloat(payinMerchantFee) || 0.0 : 0.0,
          payinQrProviderFee: payinQrProviderFee !== undefined ? parseFloat(payinQrProviderFee) || 0.0 : (qrProviderFee !== undefined ? parseFloat(qrProviderFee) || 0.0 : 0.0),
          payinAgentFee: payinAgentFee !== undefined ? parseFloat(payinAgentFee) || 0.0 : 0.0,
          payinBrokerFee: payinBrokerFee !== undefined ? parseFloat(payinBrokerFee) || 0.0 : 0.0,
          payoutMerchantFee: payoutMerchantFee !== undefined ? parseFloat(payoutMerchantFee) || 0.0 : 0.0,
          payoutQrProviderFee: payoutQrProviderFee !== undefined ? parseFloat(payoutQrProviderFee) || 0.0 : (qrProviderFee !== undefined ? parseFloat(qrProviderFee) || 0.0 : 0.0),
          payoutAgentFee: payoutAgentFee !== undefined ? parseFloat(payoutAgentFee) || 0.0 : 0.0,
          payoutBrokerFee: payoutBrokerFee !== undefined ? parseFloat(payoutBrokerFee) || 0.0 : 0.0,
          brokerId: brokerId || null,
          upiId: upiId || null,
          qrCodeUrl: qrCodeUrl || null,
          // Agent
          commissionPercent: commissionPercent !== undefined ? parseFloat(commissionPercent) || 0.0 : 0.0,
          // QR Provider
          agentId: agentId || null,
          balance: initialBal,
          exposure: 0.0,
          availableBalance: initialBal,
          qrProviderFee: qrProviderFee !== undefined ? parseFloat(qrProviderFee) || 0.0 : (payinQrProviderFee !== undefined ? parseFloat(payinQrProviderFee) || 0.0 : 3.0),
          qrProviderId: role === "OPERATOR" ? qrProviderId : null,
          // Create default wallet
          wallet: {
            create: {
              balance: role === "QR_PROVIDER" ? initialBal : 0.0,
            },
          },
        },
      });

      // If QR Provider and initial QR code provided, create initial QR Code record
      if (role === "QR_PROVIDER" && initialUpiId && initialUpiId.trim()) {
        const upi = initialUpiId.trim();
        const qrImage =
          initialQrImageUrl && initialQrImageUrl.trim()
            ? initialQrImageUrl.trim()
            : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi)}`;

        await tx.qRCode.create({
          data: {
            providerId: newUser.id,
            upiId: upi,
            imageUrl: qrImage,
            name: `${newUser.name} Primary QR`,
            accountHolderName: accountHolderName ? accountHolderName.trim() : null,
            bankName: bankName ? bankName.trim() : null,
            status: "ACTIVE",
            isActive: true,
          },
        });
      }

      // If Operator: assign selected QR codes or create initial QR code
      if (role === "OPERATOR") {
        if (Array.isArray(assignedQrIds) && assignedQrIds.length > 0) {
          await tx.qRCode.updateMany({
            where: { id: { in: assignedQrIds }, providerId: qrProviderId },
            data: { operatorId: newUser.id },
          });
        }

        if (initialUpiId && initialUpiId.trim()) {
          const upi = initialUpiId.trim();
          const qrImage =
            initialQrImageUrl && initialQrImageUrl.trim()
              ? initialQrImageUrl.trim()
              : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi)}`;

          await tx.qRCode.create({
            data: {
              providerId: qrProviderId,
              operatorId: newUser.id,
              upiId: upi,
              imageUrl: qrImage,
              name: `${newUser.name} QR`,
              accountHolderName: accountHolderName ? accountHolderName.trim() : null,
              bankName: bankName ? bankName.trim() : null,
              status: "ACTIVE",
              isActive: true,
            },
          });
        }
      }

      return newUser;
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
