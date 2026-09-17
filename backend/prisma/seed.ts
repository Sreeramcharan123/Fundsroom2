import { PrismaClient, Role, CustomerType, CustomerStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password@123", 10);

  const users = [
    {
      name: "Admin User",
      email: "admin@fundsroom.com",
      role: Role.ADMIN,
    },
    {
      name: "Sales User",
      email: "sales@fundsroom.com",
      role: Role.SALES,
    },
    {
      name: "Warehouse User",
      email: "warehouse@fundsroom.com",
      role: Role.WAREHOUSE,
    },
    {
      name: "Accounts User",
      email: "accounts@fundsroom.com",
      role: Role.ACCOUNTS,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password,
        role: user.role,
      },
    });
  }

  console.log("✅ Users seeded successfully");

  const products = [
    {
      name: "Diesel Engine Oil 15W-40 (20L)",
      sku: "PRD-1001",
      category: "Lubricants",
      unitPrice: 4200,
      currentStock: 120,
      minStockAlert: 25,
      warehouse: "Main Warehouse",
    },
    {
      name: "Hydraulic Hoses 3/4 inch (Roll 50m)",
      sku: "PRD-1002",
      category: "Hydraulics",
      unitPrice: 7800,
      currentStock: 60,
      minStockAlert: 15,
      warehouse: "Main Warehouse",
    },
    {
      name: "Ball Bearings 6205-2RS",
      sku: "PRD-1003",
      category: "Bearings",
      unitPrice: 340,
      currentStock: 500,
      minStockAlert: 100,
      warehouse: "Store B",
    },
    {
      name: "Welding Electrodes E6013 (5kg Pack)",
      sku: "PRD-1004",
      category: "Consumables",
      unitPrice: 1450,
      currentStock: 90,
      minStockAlert: 20,
      warehouse: "Store B",
    },
    {
      name: "CNC Milling Cutter 12mm",
      sku: "PRD-1005",
      category: "Tools",
      unitPrice: 2200,
      currentStock: 75,
      minStockAlert: 18,
      warehouse: "Tool Room",
    },
    {
      name: "V-Belts B-58 (Industrial)",
      sku: "PRD-1006",
      category: "Power Transmission",
      unitPrice: 185,
      currentStock: 800,
      minStockAlert: 150,
      warehouse: "Main Warehouse",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        sku: product.sku,
      },
      update: {
        name: product.name,
        category: product.category,
        unitPrice: product.unitPrice,
        currentStock: product.currentStock,
        minStockAlert: product.minStockAlert,
        warehouse: product.warehouse,
      },
      create: {
        name: product.name,
        sku: product.sku,
        category: product.category,
        unitPrice: product.unitPrice,
        currentStock: product.currentStock,
        minStockAlert: product.minStockAlert,
        warehouse: product.warehouse,
      },
    });
  }

  console.log("✅ 6 industrial products seeded successfully");

  const customers = [
    {
      name: "Rakesh Sharma",
      mobile: "9822011133",
      email: "rakesh@sharmaengg.in",
      businessName: "Sharma Engineering Works",
      gstNumber: "27AABCS1429F1Z2",
      type: CustomerType.WHOLESALE,
      address: "Plot 14, MIDC Industrial Area, Pune, Maharashtra",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Mohammed Irfan",
      mobile: "9930144556",
      email: "irfan@impextextiles.com",
      businessName: "Irfan Textile Impex",
      gstNumber: "24AAECI7812K1Z8",
      type: CustomerType.RETAIL,
      address: "Shop 22, Textile Market, Surat, Gujarat",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Kavitha Reddy",
      mobile: "9008025567",
      email: "kavitha@gmail.com",
      businessName: "Reddy Agro Industries",
      gstNumber: "36AABCR5674P1Z4",
      type: CustomerType.DISTRIBUTOR,
      address: "Unit 3, Hardware Park, Hyderabad, Telangana",
      status: CustomerStatus.LEAD,
    },
    {
      name: "Anil Deshmukh",
      mobile: "9765023410",
      email: "anil@deshmukhtools.com",
      businessName: "Deshmukh Tool Traders",
      gstNumber: "27AAHPD8811L1Z6",
      type: CustomerType.WHOLESALE,
      address: "Bhosari Industrial Estate, Pune, Maharashtra",
      status: CustomerStatus.ACTIVE,
    },
    {
      name: "Priya Nair",
      mobile: "9619864412",
      email: "priya@nairmachinery.co.in",
      businessName: "Nair Machinery & Spares",
      gstNumber: "32AAKCN7719Q1Z5",
      type: CustomerType.DISTRIBUTOR,
      address: "Kochi Special Economic Zone, Kochi, Kerala",
      status: CustomerStatus.LEAD,
    },
  ];

  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({
      where: { mobile: customer.mobile },
    });

    if (!existing) {
      await prisma.customer.create({
        data: customer,
      });
    }
  }

  console.log("✅ 5 sample customers seeded successfully");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });