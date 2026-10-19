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
      email: {
        notIn: [
          "admin@goapay.com",
          "merchant@goapay.com",
          "provider@goapay.com",
          "agent@goapay.com",
          "broker@goapay.com",
          "operator@goapay.com",
        ],
      },
    },
  });
  console.log("Cleared all extra users, orders, ledger statements, and audit logs.");

  // 1. Create Default Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@goapay.com" },
    update: {
      passwordHash: adminPassword,
    },
    create: {
      role: "ADMIN",
      name: "Super Admin",
      email: "admin@goapay.com",
      phone: "+919876543210",
      telegramId: "@goa_admin",
      passwordHash: adminPassword,
    },
  });
  console.log("Admin ready:", admin.email);

  // 2. Create Agent
  const agentPassword = await bcrypt.hash("agent123", 10);
  const agent = await prisma.user.upsert({
    where: { email: "agent@goapay.com" },
    update: {
      name: "Master Agent Rajesh",
      commissionPercent: 1.0,
      passwordHash: agentPassword,
    },
    create: {
      role: "AGENT",
      name: "Master Agent Rajesh",
      email: "agent@goapay.com",
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
  console.log("Agent ready:", agent.email);

  // 3. Create Dedicated Broker
  const brokerPassword = await bcrypt.hash("broker123", 10);
  const broker = await prisma.user.upsert({
    where: { email: "broker@goapay.com" },
    update: {
      role: "BROKER",
      commissionPercent: 1.0,
      status: "ACTIVE",
      passwordHash: brokerPassword,
    },
    create: {
      role: "BROKER",
      name: "Elite Merchant Broker",
      email: "broker@goapay.com",
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
  console.log("Broker ready:", broker.email);

  // 4. Create Merchant (with Elite Merchant Broker assigned, 0.00 wallet)
  const merchantPassword = await bcrypt.hash("merchant123", 10);
  const merchant = await prisma.user.upsert({
    where: { email: "merchant@goapay.com" },
    update: {
      name: "Goa Beachwear Store",
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
    },
    create: {
      role: "MERCHANT",
      name: "Goa Beachwear Store",
      email: "merchant@goapay.com",
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
      brokerId: broker.id, // Assigned to Elite Broker
      status: "ACTIVE",
      passwordHash: merchantPassword,
      wallet: {
        create: { balance: 0.0 },
      },
    },
  });
  console.log("Merchant ready:", merchant.email);

  // 5. Create QR Provider (Account Provider with 10,000 initial liquidity balance)
  const providerPassword = await bcrypt.hash("provider123", 10);
  const provider = await prisma.user.upsert({
    where: { email: "provider@goapay.com" },
    update: {
      name: "FastPay Liquidity Provider",
      balance: 10000.0,
      exposure: 0.0,
      availableBalance: 10000.0,
      passwordHash: providerPassword,
    },
    create: {
      role: "QR_PROVIDER",
      name: "FastPay Liquidity Provider",
      email: "provider@goapay.com",
      phone: "+919833344455",
      address: "Margao, Goa",
      telegramId: "@fastpay_provider",
      agentId: agent.id, // Related to Agent Rajesh
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
  console.log("QR Provider ready:", provider.email);

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
    where: { email: "operator@goapay.com" },
    update: {
      name: "FastPay Shift Operator",
      qrProviderId: provider.id,
      status: "ACTIVE",
      portalAccess: true,
      transactionAllowed: true,
      passwordHash: operatorPassword,
    },
    create: {
      role: "OPERATOR",
      name: "FastPay Shift Operator",
      email: "operator@goapay.com",
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
  console.log("Operator ready:", operator.email, "(belongs to:", provider.name, ")");

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
  // Merchant, Broker, Agent wallets = 0.00
  await prisma.wallet.updateMany({
    where: {
      user: {
        role: { in: ["MERCHANT", "AGENT", "BROKER"] },
      },
    },
    data: { balance: 0.0 },
  });

  // QR Provider wallet = 10,000.00
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
