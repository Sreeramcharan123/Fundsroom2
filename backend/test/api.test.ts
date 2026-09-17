import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../src/app";
import prisma from "../src/lib/prisma";

const suffix = `${Date.now()}${Math.floor(Math.random() * 9000)}`;
const PASSWORD = "Password@123";

const adminEmail = `admin.test.${suffix}@fundsroom.com`;
const salesEmail = `sales.test.${suffix}@fundsroom.com`;

const adminId = { value: 0 };
const salesId = { value: 0 };

const created = {
  customers: [] as number[],
  products: [] as number[],
  enquiries: [] as number[],
  quotations: [] as number[],
  salesOrders: [] as number[],
};

let adminToken = "";
let salesToken = "";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function setupUsers() {
  const password = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Test Admin",
      email: adminEmail,
      password,
      role: "ADMIN",
    },
  });

  const sales = await prisma.user.create({
    data: {
      name: "Test Sales",
      email: salesEmail,
      password,
      role: "SALES",
    },
  });

  adminId.value = admin.id;
  salesId.value = sales.id;

  const adminRes = await request(app)
    .post("/auth/login")
    .send({ email: adminEmail, password: PASSWORD });
  adminToken = adminRes.body.token;

  const salesRes = await request(app)
    .post("/auth/login")
    .send({ email: salesEmail, password: PASSWORD });
  salesToken = salesRes.body.token;

  assert.ok(adminToken, "Admin token should be issued");
  assert.ok(salesToken, "Sales token should be issued");
}

async function createCustomer(name = "Test Customer") {
  const res = await request(app)
    .post("/customers")
    .set(auth(adminToken))
    .send({
      name,
      mobile: `9${suffix.slice(-9)}`,
      email: `${name.replace(/\s+/g, ".").toLowerCase()}.${suffix}@test.com`,
      businessName: `${name} Pvt Ltd`,
      type: "WHOLESALE",
      address: "Test Industrial Estate",
      status: "ACTIVE",
    });

  assert.equal(res.status, 201, JSON.stringify(res.body));
  created.customers.push(res.body.customer.id);
  return res.body.customer.id as number;
}

async function createProduct(unitPrice: number, currentStock: number) {
  const res = await request(app)
    .post("/products")
    .set(auth(adminToken))
    .send({
      name: `Test Product ${suffix}-${created.products.length}`,
      sku: `TEST-${suffix}-${created.products.length}`,
      category: "Testing",
      unitPrice,
      currentStock,
      minStockAlert: 1,
      warehouse: "Test Warehouse",
    });

  assert.equal(res.status, 201, JSON.stringify(res.body));
  created.products.push(res.body.product.id);
  return res.body.product.id as number;
}

async function createEnquiry(customerId: number, items: { productId: number; quantity: number }[]) {
  const res = await request(app)
    .post("/enquiries")
    .set(auth(salesToken))
    .send({ customerId, items, notes: "Automated test enquiry" });

  assert.equal(res.status, 201, JSON.stringify(res.body));
  created.enquiries.push(res.body.enquiry.id);
  return res.body.enquiry.id as number;
}

async function createQuotation(
  enquiryId: number,
  items: {
    productId: number;
    quantity: number;
    discountPct?: number;
    gstPct?: number;
  }[]
) {
  const res = await request(app)
    .post("/quotations")
    .set(auth(salesToken))
    .send({
      enquiryId,
      items,
      // Deliberately bogus totals to prove the backend ignores client totals.
      subtotal: 1,
      totalDiscount: 1,
      totalGst: 1,
      grandTotal: 1,
    });

  assert.equal(res.status, 201, JSON.stringify(res.body));
  created.quotations.push(res.body.quotation.id);
  return res.body.quotation;
}

async function setQuotationStatus(quotationId: number, status: string) {
  const res = await request(app)
    .patch(`/quotations/${quotationId}/status`)
    .set(auth(adminToken))
    .send({ status });

  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.quotation;
}

async function convertQuotation(quotationId: number) {
  const res = await request(app)
    .post(`/quotations/${quotationId}/convert`)
    .set(auth(salesToken))
    .send({});

  if (res.status === 201) {
    created.salesOrders.push(res.body.salesOrder.id);
  }

  return res;
}

before(setupUsers);

test("1. Quotation total is calculated correctly by the backend", async () => {
  const customerId = await createCustomer("Quotation Total Customer");
  const productA = await createProduct(100, 50);
  const productB = await createProduct(200, 50);
  const enquiryId = await createEnquiry(customerId, [
    { productId: productA, quantity: 10 },
    { productId: productB, quantity: 5 },
  ]);

  const quotation = await createQuotation(enquiryId, [
    { productId: productA, quantity: 10, discountPct: 10, gstPct: 18 },
    { productId: productB, quantity: 5, discountPct: 0, gstPct: 12 },
  ]);

  // Item A: base 1000, discount 100, taxable 900, gst 162, line 1062
  // Item B: base 1000, discount 0, taxable 1000, gst 120, line 1120
  assert.equal(Number(quotation.subtotal), 2000);
  assert.equal(Number(quotation.totalDiscount), 100);
  assert.equal(Number(quotation.totalGst), 282);
  assert.equal(Number(quotation.grandTotal), 2182);

  const itemA = quotation.items.find((i: any) => i.productId === productA);
  const itemB = quotation.items.find((i: any) => i.productId === productB);

  assert.equal(Number(itemA.baseAmount), 1000);
  assert.equal(Number(itemA.discountAmount), 100);
  assert.equal(Number(itemA.gstAmount), 162);
  assert.equal(Number(itemA.lineTotal), 1062);

  assert.equal(Number(itemB.baseAmount), 1000);
  assert.equal(Number(itemB.lineTotal), 1120);
});

test("2. DRAFT and REJECTED quotations cannot create a Sales Order", async () => {
  const customerId = await createCustomer("Draft Reject Customer");
  const productId = await createProduct(500, 20);
  const enquiryId = await createEnquiry(customerId, [
    { productId, quantity: 2 },
  ]);
  const quotation = await createQuotation(enquiryId, [
    { productId, quantity: 2, discountPct: 0, gstPct: 18 },
  ]);

  // DRAFT cannot convert
  const draftConvert = await convertQuotation(quotation.id);
  assert.equal(draftConvert.status, 400);

  // Move to SENT then REJECTED
  await setQuotationStatus(quotation.id, "SENT");
  await setQuotationStatus(quotation.id, "REJECTED");

  const rejectedConvert = await convertQuotation(quotation.id);
  assert.equal(rejectedConvert.status, 400);

  const orderCount = await prisma.salesOrder.count({
    where: { quotationId: quotation.id },
  });
  assert.equal(orderCount, 0);
});

test("3. The same quotation cannot generate duplicate Sales Orders", async () => {
  const customerId = await createCustomer("Duplicate Customer");
  const productId = await createProduct(750, 30);
  const enquiryId = await createEnquiry(customerId, [
    { productId, quantity: 3 },
  ]);
  const quotation = await createQuotation(enquiryId, [
    { productId, quantity: 3, discountPct: 5, gstPct: 18 },
  ]);

  await setQuotationStatus(quotation.id, "SENT");
  await setQuotationStatus(quotation.id, "ACCEPTED");

  const first = await convertQuotation(quotation.id);
  assert.equal(first.status, 201);

  const second = await convertQuotation(quotation.id);
  assert.equal(second.status, 400);

  const orderCount = await prisma.salesOrder.count({
    where: { quotationId: quotation.id },
  });
  assert.equal(orderCount, 1);
});

test("4. Cannot reserve more than available inventory", async () => {
  const customerId = await createCustomer("Oversell Customer");
  const productId = await createProduct(300, 10); // only 10 available
  const enquiryId = await createEnquiry(customerId, [
    { productId, quantity: 15 },
  ]);
  const quotation = await createQuotation(enquiryId, [
    { productId, quantity: 15, discountPct: 0, gstPct: 18 },
  ]);

  await setQuotationStatus(quotation.id, "SENT");
  await setQuotationStatus(quotation.id, "ACCEPTED");

  const converted = await convertQuotation(quotation.id);
  assert.equal(converted.status, 201);
  const salesOrderId = converted.body.salesOrder.id;

  const confirmRes = await request(app)
    .post(`/sales-orders/${salesOrderId}/confirm`)
    .set(auth(adminToken))
    .send({});

  assert.equal(confirmRes.status, 400, JSON.stringify(confirmRes.body));

  const product = await prisma.product.findUnique({ where: { id: productId } });
  assert.equal(product?.reservedQuantity, 0, "Reservation must not change on failure");
  assert.equal(product?.currentStock, 10, "Physical stock must not change on failed confirm");
});

test("5. Unauthorized user cannot perform restricted operation", async () => {
  // SALES cannot create products (ADMIN / WAREHOUSE only)
  const productRes = await request(app)
    .post("/products")
    .set(auth(salesToken))
    .send({
      name: "Forbidden Product",
      sku: `FORBIDDEN-${suffix}`,
      category: "Testing",
      unitPrice: 100,
      currentStock: 1,
      minStockAlert: 1,
      warehouse: "Test",
    });
  assert.equal(productRes.status, 403);

  // Prepare a real sales order to attempt admin-only confirm with SALES token
  const customerId = await createCustomer("RBAC Customer");
  const productId = await createProduct(120, 20);
  const enquiryId = await createEnquiry(customerId, [
    { productId, quantity: 2 },
  ]);
  const quotation = await createQuotation(enquiryId, [
    { productId, quantity: 2, discountPct: 0, gstPct: 18 },
  ]);
  await setQuotationStatus(quotation.id, "SENT");
  await setQuotationStatus(quotation.id, "ACCEPTED");
  const converted = await convertQuotation(quotation.id);
  const salesOrderId = converted.body.salesOrder.id;

  // SALES cannot confirm a sales order (ADMIN only)
  const confirmRes = await request(app)
    .post(`/sales-orders/${salesOrderId}/confirm`)
    .set(auth(salesToken))
    .send({});
  assert.equal(confirmRes.status, 403);

  // SALES cannot dispatch a sales order (ADMIN only)
  const dispatchRes = await request(app)
    .post(`/sales-orders/${salesOrderId}/dispatch`)
    .set(auth(salesToken))
    .send({});
  assert.equal(dispatchRes.status, 403);

  // Requests without a token are rejected
  const noTokenRes = await request(app).get("/sales-orders");
  assert.equal(noTokenRes.status, 401);
});

test("6. Simultaneous reservations cannot oversell stock (row locking)", async () => {
  const customerId = await createCustomer("Concurrent Customer");
  const productId = await createProduct(900, 10); // 10 units total

  // Two accepted quotations, each needing 6 units (> half of stock)
  const orderIds: number[] = [];

  for (let i = 0; i < 2; i++) {
    const enquiryId = await createEnquiry(customerId, [
      { productId, quantity: 6 },
    ]);
    const quotation = await createQuotation(enquiryId, [
      { productId, quantity: 6, discountPct: 0, gstPct: 18 },
    ]);
    await setQuotationStatus(quotation.id, "SENT");
    await setQuotationStatus(quotation.id, "ACCEPTED");
    const converted = await convertQuotation(quotation.id);
    assert.equal(converted.status, 201);
    orderIds.push(converted.body.salesOrder.id);
  }

  const [r1, r2] = await Promise.all(
    orderIds.map((orderId) =>
      request(app)
        .post(`/sales-orders/${orderId}/confirm`)
        .set(auth(adminToken))
        .send({})
    )
  );

  const statuses = [r1.status, r2.status].sort();
  assert.deepEqual(
    statuses,
    [200, 400],
    `Exactly one reservation should succeed. Got ${JSON.stringify([r1.status, r2.status])}`
  );

  const product = await prisma.product.findUnique({ where: { id: productId } });
  assert.equal(
    product?.reservedQuantity,
    6,
    "Reserved quantity must equal a single successful reservation"
  );
  assert.equal(product?.currentStock, 10, "Physical stock must be untouched by reservation");
});

test("7. Successful confirm reserves stock and dispatch reduces physical + reserved", async () => {
  const customerId = await createCustomer("Dispatch Flow Customer");
  const productId = await createProduct(640, 20);
  const enquiryId = await createEnquiry(customerId, [
    { productId, quantity: 4 },
  ]);
  const quotation = await createQuotation(enquiryId, [
    { productId, quantity: 4, discountPct: 0, gstPct: 18 },
  ]);

  await setQuotationStatus(quotation.id, "SENT");
  await setQuotationStatus(quotation.id, "ACCEPTED");
  const converted = await convertQuotation(quotation.id);
  assert.equal(converted.status, 201);
  const salesOrderId = converted.body.salesOrder.id;

  const confirmRes = await request(app)
    .post(`/sales-orders/${salesOrderId}/confirm`)
    .set(auth(adminToken))
    .send({});
  assert.equal(confirmRes.status, 200, JSON.stringify(confirmRes.body));

  const afterConfirm = await prisma.product.findUnique({
    where: { id: productId },
  });
  assert.equal(afterConfirm?.reservedQuantity, 4, "Confirm must reserve 4 units");
  assert.equal(afterConfirm?.currentStock, 20, "Confirm must not reduce physical stock");

  const dispatchRes = await request(app)
    .post(`/sales-orders/${salesOrderId}/dispatch`)
    .set(auth(adminToken))
    .send({});
  assert.equal(dispatchRes.status, 200, JSON.stringify(dispatchRes.body));

  const afterDispatch = await prisma.product.findUnique({
    where: { id: productId },
  });
  assert.equal(afterDispatch?.currentStock, 16, "Dispatch must reduce physical stock");
  assert.equal(afterDispatch?.reservedQuantity, 0, "Dispatch must reduce reserved stock");

  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
  });
  assert.equal(salesOrder?.status, "DISPATCHED");

  // Duplicate dispatch must be prevented
  const duplicate = await request(app)
    .post(`/sales-orders/${salesOrderId}/dispatch`)
    .set(auth(adminToken))
    .send({});
  assert.equal(duplicate.status, 400);
});

after(async () => {
  try {
    if (created.salesOrders.length) {
      await prisma.dispatch.deleteMany({
        where: { salesOrderId: { in: created.salesOrders } },
      });
      await prisma.salesOrder.deleteMany({
        where: { id: { in: created.salesOrders } },
      });
    }

    if (created.quotations.length) {
      await prisma.quotation.deleteMany({
        where: { id: { in: created.quotations } },
      });
    }

    if (created.enquiries.length) {
      await prisma.enquiry.deleteMany({
        where: { id: { in: created.enquiries } },
      });
    }

    if (created.products.length) {
      await prisma.stockMovement.deleteMany({
        where: { productId: { in: created.products } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: created.products } },
      });
    }

    if (created.customers.length) {
      await prisma.customer.deleteMany({
        where: { id: { in: created.customers } },
      });
    }

    await prisma.user.deleteMany({
      where: { id: { in: [adminId.value, salesId.value] } },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
  } finally {
    await prisma.$disconnect();
  }
});
