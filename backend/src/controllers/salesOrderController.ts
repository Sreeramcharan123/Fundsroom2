import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { Prisma, SalesOrderStatus } from "@prisma/client";
import { generateNumber } from "../utils/quoteCalc";

interface LockedProductRow {
  id: number;
  name: string;
  currentStock: number;
  reservedQuantity: number;
}

export const getSalesOrders = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "");
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const where = search
      ? {
          OR: [
            {
              orderNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              customer: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              customer: {
                businessName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {};

    const [salesOrders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: true,
          quotation: true,
          creator: { select: { id: true, name: true } },
          confirmer: { select: { id: true, name: true } },
          items: {
            include: {
              product: true,
            },
          },
          dispatches: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: salesOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get sales orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales orders",
    });
  }
};

export const getSalesOrderById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sales order ID",
      });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: true,
        creator: { select: { id: true, name: true } },
        confirmer: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
          },
        },
        dispatches: { include: { items: true } },
      },
    });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      salesOrder,
    });
  } catch (error) {
    console.error("Get sales order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales order",
    });
  }
};

// Reserved quantities are increased. Physical quantity is unchanged.
// Row locking protects against simultaneous requests overselling stock.
export const confirmSalesOrder = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sales order ID",
      });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (salesOrder.status !== SalesOrderStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Only PENDING sales orders can be confirmed. Current status: ${salesOrder.status}`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const productIds = salesOrder.items.map((item) => item.productId);

      // Lock product rows so concurrent confirmations cannot oversell.
      const lockedProducts = await tx.$queryRaw<LockedProductRow[]>`
        SELECT id, name, "currentStock", "reservedQuantity"
        FROM "Product"
        WHERE id IN (${Prisma.join(productIds)})
        FOR UPDATE
      `;

      if (lockedProducts.length !== productIds.length) {
        throw new Error("One or more products no longer exist");
      }

      // Validate availability for EVERY item before updating anything.
      for (const item of salesOrder.items) {
        const product = lockedProducts.find((p) => p.id === item.productId);

        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }

        const available = product.currentStock - product.reservedQuantity;

        if (available < item.quantity) {
          throw new Error(
            `Insufficient available inventory for ${item.productName}. Requested: ${item.quantity}, Available: ${available} (Physical: ${product.currentStock}, Reserved: ${product.reservedQuantity})`
          );
        }
      }

      // Reserve stock: increase reservedQuantity only.
      for (const item of salesOrder.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      return await tx.salesOrder.update({
        where: { id },
        data: {
          status: SalesOrderStatus.CONFIRMED,
          confirmedBy: user.userId,
        },
        include: {
          customer: true,
          quotation: true,
          items: {
            include: {
              product: true,
            },
          },
          dispatches: true,
        },
      });
    }, { maxWait: 15000, timeout: 30000 });

    return res.status(200).json({
      success: true,
      message: "Sales Order confirmed and inventory reserved",
      salesOrder: result,
    });
  } catch (error: any) {
    console.error("Confirm sales order error:", error);

    if (error.message && error.message.toLowerCase().includes("available")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to confirm sales order",
    });
  }
};

// During dispatch: physical quantity decreases AND reserved quantity decreases.
export const dispatchSalesOrder = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sales order ID",
      });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true, dispatches: true },
    });

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (salesOrder.status === SalesOrderStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: "A cancelled Sales Order cannot be dispatched",
      });
    }

    if (salesOrder.status === SalesOrderStatus.DISPATCHED) {
      return res.status(400).json({
        success: false,
        message: "This Sales Order has already been dispatched",
      });
    }

    if (salesOrder.status !== SalesOrderStatus.CONFIRMED) {
      return res.status(400).json({
        success: false,
        message: `Only CONFIRMED sales orders can be dispatched. Current status: ${salesOrder.status}`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const productIds = salesOrder.items.map((item) => item.productId);

      const lockedProducts = await tx.$queryRaw<LockedProductRow[]>`
        SELECT id, name, "currentStock", "reservedQuantity"
        FROM "Product"
        WHERE id IN (${Prisma.join(productIds)})
        FOR UPDATE
      `;

      if (lockedProducts.length !== productIds.length) {
        throw new Error("One or more products no longer exist");
      }

      // Prevent dispatch beyond reserved quantity.
      for (const item of salesOrder.items) {
        const product = lockedProducts.find((p) => p.id === item.productId);

        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }

        if (product.reservedQuantity < item.quantity) {
          throw new Error(
            `Cannot dispatch ${item.quantity} of ${item.productName}. Only ${product.reservedQuantity} reserved units available`
          );
        }
      }

      // Physical quantity decreases, reserved quantity decreases.
      for (const item of salesOrder.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: "OUT",
            reason: `Sales Order ${salesOrder.orderNumber} dispatch`,
            createdBy: user.userId,
          },
        });
      }

      const dispatch = await tx.dispatch.create({
        data: {
          dispatchNumber: generateNumber("DSP"),
          salesOrderId: id,
          createdBy: user.userId,
          items: {
            create: salesOrder.items.map((item) => ({
              salesOrderItemId: item.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: {
          status: SalesOrderStatus.DISPATCHED,
          dispatchedAt: new Date(),
        },
        include: {
          customer: true,
          quotation: true,
          items: {
            include: {
              product: true,
            },
          },
          dispatches: true,
        },
      });

      return { dispatch, salesOrder: updatedOrder };
    }, { maxWait: 15000, timeout: 30000 });

    return res.status(200).json({
      success: true,
      message: "Sales Order dispatched successfully",
      dispatch: result.dispatch,
      salesOrder: result.salesOrder,
    });
  } catch (error: any) {
    console.error("Dispatch sales order error:", error);

    if (
      error.message &&
      (error.message.toLowerCase().includes("dispatch") ||
        error.message.toLowerCase().includes("reserved"))
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to dispatch sales order",
    });
  }
};