import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database (User Accounts Only, Zero Orders)...");

  // 0. Remove all previous orders, ledger transactions, and audit logs to ensure clean slate
  await prisma.ledgerEntry.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // Remove all extra/test users outside standard roles
  await prisma.user.deleteMany({
    where: {
      name: {
        notIn: [
          "admin",
          "merchant",
          "provider",
          "agent",
          "broker",
          "operator",
        ],
      },
    },
  });
  console.log("Cleared all extra users, orders, ledger statements, and audit logs.");

  // 1. Create Default Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { name: "admin" },
    update: {
      passwordHash: adminPassword,
      role: "ADMIN",
    },
    create: {
      role: "ADMIN",
      name: "admin",
      phone: "+919876543210",
      telegramId: "@goa_admin",
      passwordHash: adminPassword,
    },
  });
  console.log("Admin ready:", admin.name);

  // 2. Create Agent
  const agentPassword = await bcrypt.hash("agent123", 10);
  const agent = await prisma.user.upsert({
    where: { name: "agent" },
    update: {
      commissionPercent: 1.0,
      passwordHash: agentPassword,
      role: "AGENT",
    },
    create: {
      role: "AGENT",
      name: "agent",
      phone: "+919811122233",
      address: "Panaji, Goa",
      telegramId: "@agent_rajesh",
      commissionPercent: 1.0, // 1%
      passwordHash: agentPassword,
      wallet: {
        create: { balance: 0.0 },
      },
    },
  });
  console.log("Agent ready:", agent.name);

  // 3. Create Dedicated Broker
  const brokerPassword = await bcrypt.hash("broker123", 10);
  const broker = await prisma.user.upsert({
    where: { name: "broker" },
    update: {
      role: "BROKER",
      commissionPercent: 1.0,
      status: "ACTIVE",
      passwordHash: brokerPassword,
    },
    create: {
      role: "BROKER",
      name: "broker",
      phone: "+919844455566",
      address: "Panaji, Goa",
      telegramId: "@elite_broker",
      commissionPercent: 1.0, // 1%
      status: "ACTIVE",
      passwordHash: brokerPassword,
      wallet: {
        create: { balance: 0.0 },
      },
    },
  });
  console.log("Broker ready:", broker.name);

  // 4. Create Merchant (with Broker assigned, 0.00 wallet)
  const merchantPassword = await bcrypt.hash("merchant123", 10);
  const merchant = await prisma.user.upsert({
    where: { name: "merchant" },
    update: {
      brokerId: broker.id,
      payinMerchantFee: 5.0,
      payinQrProviderFee: 2.0,
      payinAgentFee: 1.0,
      payinBrokerFee: 1.0,
      payoutMerchantFee: 5.0,
      payoutQrProviderFee: 2.0,
      payoutAgentFee: 1.0,
      payoutBrokerFee: 2.0,
      status: "ACTIVE",
      passwordHash: merchantPassword,
      role: "MERCHANT",
    },
    create: {
      role: "MERCHANT",
      name: "merchant",
      phone: "+919822233344",
      address: "Calangute, Goa",
      telegramId: "@beachwear_merchant",
      upiId: "beachwear@upi",
      qrCodeUrl: "/uploads/sample-merchant-qr.png",
      payinMerchantFee: 5.0,
      payinQrProviderFee: 2.0,
      payinAgentFee: 1.0,
      payinBrokerFee: 1.0,
      payoutMerchantFee: 5.0,
      payoutQrProviderFee: 2.0,
      payoutAgentFee: 1.0,
      payoutBrokerFee: 2.0,
      brokerId: broker.id, // Assigned to Broker
      status: "ACTIVE",
      passwordHash: merchantPassword,
      wallet: {
        create: { balance: 0.0 },
      },
    },
  });
  console.log("Merchant ready:", merchant.name);

  // 5. Create QR Provider (Account Provider with 10,000 initial liquidity balance)
  const providerPassword = await bcrypt.hash("provider123", 10);
  const provider = await prisma.user.upsert({
    where: { name: "provider" },
    update: {
      balance: 10000.0,
      exposure: 0.0,
      availableBalance: 10000.0,
      passwordHash: providerPassword,
      role: "QR_PROVIDER",
    },
    create: {
      role: "QR_PROVIDER",
      name: "provider",
      phone: "+919833344455",
      address: "Margao, Goa",
      telegramId: "@fastpay_provider",
      agentId: agent.id, // Related to Agent
      balance: 10000.0,
      exposure: 0.0,
      availableBalance: 10000.0,
      qrProviderFee: 3.0, // 3%
      passwordHash: providerPassword,
      wallet: {
        create: { balance: 10000.0 },
      },
      qrCodes: {
        create: [
          {
            upiId: "fastpay.provider@icici",
            imageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=fastpay.provider@icici&pn=FastPay&cu=INR",
            accountHolderName: "FastPay Liquidity Services",
            bankName: "ICICI Bank",
            isActive: true,
          },
          {
            upiId: "fastpay.backup@hdfc",
            imageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=fastpay.backup@hdfc&pn=FastPayHDFC&cu=INR",
            accountHolderName: "FastPay Secondary",
            bankName: "HDFC Bank",
            isActive: true,
          },
        ],
      },
    },
  });
  console.log("QR Provider ready:", provider.name);

  // Ensure provider has active QR codes
  const providerQrCount = await prisma.qRCode.count({ where: { providerId: provider.id } });
  if (providerQrCount === 0) {
    await prisma.qRCode.createMany({
      data: [
        {
          providerId: provider.id,
          upiId: "fastpay.provider@icici",
          imageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=fastpay.provider@icici&pn=FastPay&cu=INR",
          accountHolderName: "FastPay Liquidity Services",
          bankName: "ICICI Bank",
          isActive: true,
        },
        {
          providerId: provider.id,
          upiId: "fastpay.backup@hdfc",
          imageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=fastpay.backup@hdfc&pn=FastPayHDFC&cu=INR",
          accountHolderName: "FastPay Secondary",
          bankName: "HDFC Bank",
          isActive: true,
        },
      ],
    });
  }

  // 6. Create Default Operator under FastPay QR Provider
  const operatorPassword = await bcrypt.hash("operator123", 10);
  const operator = await prisma.user.upsert({
    where: { name: "operator" },
    update: {
      qrProviderId: provider.id,
      status: "ACTIVE",
      portalAccess: true,
      transactionAllowed: true,
      passwordHash: operatorPassword,
      role: "OPERATOR",
    },
    create: {
      role: "OPERATOR",
      name: "operator",
      phone: "+919877788899",
      address: "Margao, Goa",
      telegramId: "@fastpay_operator1",
      qrProviderId: provider.id,
      status: "ACTIVE",
      portalAccess: true,
      transactionAllowed: true,
      passwordHash: operatorPassword,
    },
  });
  console.log("Operator ready:", operator.name, "(belongs to:", provider.name, ")");

  // Assign the primary QR code to this Operator
  const primaryQR = await prisma.qRCode.findFirst({
    where: { providerId: provider.id, upiId: "fastpay.provider@icici" },
  });
  if (primaryQR) {
    await prisma.qRCode.update({
      where: { id: primaryQR.id },
      data: { operatorId: operator.id },
    });
    console.log(`Assigned QR code '${primaryQR.upiId}' to Operator '${operator.name}'`);
  }

  // 7. Reset all wallets to their clean initial state
  await prisma.wallet.updateMany({
    where: {
      user: {
        role: { in: ["MERCHANT", "AGENT", "BROKER"] },
      },
    },
    data: { balance: 0.0 },
  });

  await prisma.wallet.updateMany({
    where: {
      user: {
        role: "QR_PROVIDER",
      },
    },
    data: { balance: 10000.0 },
  });

  console.log("All wallets cleanly reset: Merchant = ₹0.00, Broker = ₹0.00, Agent = ₹0.00, Provider Liquidity = ₹10,000.00");
  console.log("Database seeded successfully with ONLY user accounts (0 orders).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
