import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { ChallanStatus } from "@prisma/client";

const generateChallanNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `CH-${year}${month}${day}-${random}`;
};

// CREATE CHALLAN
export const createChallan = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { customerId, items, status } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: Number(customerId),
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Validate quantities
    for (const item of items) {
      if (
        !Number.isInteger(Number(item.productId)) ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Each product must have a valid positive quantity",
        });
      }
    }

    // Fetch products
    const productIds = items.map((item: any) => Number(item.productId));

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more products were not found",
      });
    }

    // Create snapshot items
    const challanItems = items.map((item: any) => {
      const product = products.find(
        (p) => p.id === Number(item.productId)
      );

      if (!product) {
        throw new Error("Product not found");
      }

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice: product.unitPrice,
        quantity: Number(item.quantity),
      };
    });

    const totalQuantity = challanItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const challanStatus =
      status === "CONFIRMED"
        ? ChallanStatus.CONFIRMED
        : ChallanStatus.DRAFT;

    // Draft can simply be created.
    if (challanStatus === ChallanStatus.DRAFT) {
      const challan = await prisma.salesChallan.create({
        data: {
          challanNumber: generateChallanNumber(),
          customerId: Number(customerId),
          totalQuantity,
          status: ChallanStatus.DRAFT,
          createdBy: user.userId,
          items: {
            create: challanItems,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Challan saved as draft",
        challan,
      });
    }

    // CONFIRMED challan
    const challan = await prisma.$transaction(async (tx) => {
      // Re-fetch products inside transaction
      const currentProducts = await tx.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        // Locking is database-dependent; stock is checked again
        // inside the transaction before updates.
      });

      // Check stock for EVERY product before changing anything
      for (const item of challanItems) {
        const product = currentProducts.find(
          (p) => p.id === item.productId
        );

        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }

        if (product.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`
          );
        }
      }

      // Deduct stock
      for (const item of challanItems) {
        const product = currentProducts.find(
          (p) => p.id === item.productId
        );

        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        // Create OUT stock movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            type: "OUT",
            reason: "Sales Challan",
            createdBy: user.userId,
          },
        });
      }

      // Create confirmed challan
      return await tx.salesChallan.create({
        data: {
          challanNumber: generateChallanNumber(),
          customerId: Number(customerId),
          totalQuantity,
          status: ChallanStatus.CONFIRMED,
          createdBy: user.userId,
          items: {
            create: challanItems,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: "Challan created and confirmed successfully",
      challan,
    });
  } catch (error: any) {
    console.error("Create challan error:", error);

    if (
      error.message &&
      error.message.toLowerCase().includes("insufficient stock")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create challan",
    });
  }
};

// GET ALL CHALLANS
export const getChallans = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "");
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const where = search
      ? {
          OR: [
            {
              challanNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              customer: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
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

    const [challans, total] = await Promise.all([
      prisma.salesChallan.findMany({
        where,
        include: {
          customer: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          items: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.salesChallan.count({
        where,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: challans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get challans error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch challans",
    });
  }
};

// GET CHALLAN BY ID
export const getChallanById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challan ID",
      });
    }

    const challan = await prisma.salesChallan.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: true,
      },
    });

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: "Challan not found",
      });
    }

    return res.status(200).json({
      success: true,
      challan,
    });
  } catch (error) {
    console.error("Get challan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch challan",
    });
  }
};

// CONFIRM EXISTING DRAFT
export const confirmChallan = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const user = (req as any).user;

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challan ID",
      });
    }

    const existingChallan = await prisma.salesChallan.findUnique({
      where: {
        id,
      },
      include: {
        items: true,
      },
    });

    if (!existingChallan) {
      return res.status(404).json({
        success: false,
        message: "Challan not found",
      });
    }

    if (existingChallan.status !== ChallanStatus.DRAFT) {
      return res.status(400).json({
        success: false,
        message: `Only draft challans can be confirmed. Current status: ${existingChallan.status}`,
      });
    }

    const productIds = existingChallan.items.map(
      (item) => item.productId
    );

    const confirmedChallan = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
      });

      // Check ALL stock first
      for (const item of existingChallan.items) {
        const product = products.find(
          (p) => p.id === item.productId
        );

        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }

        if (product.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`
          );
        }
      }

      // Deduct stock
      for (const item of existingChallan.items) {
        const product = products.find(
          (p) => p.id === item.productId
        );

        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            type: "OUT",
            reason: `Sales Challan ${existingChallan.challanNumber}`,
            createdBy: user.userId,
          },
        });
      }

      return await tx.salesChallan.update({
        where: {
          id,
        },
        data: {
          status: ChallanStatus.CONFIRMED,
        },
        include: {
          customer: true,
          items: true,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Challan confirmed successfully",
      challan: confirmedChallan,
    });
  } catch (error: any) {
    console.error("Confirm challan error:", error);

    if (
      error.message &&
      error.message.toLowerCase().includes("insufficient stock")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to confirm challan",
    });
  }
};

// CANCEL EXISTING DRAFT
export const cancelChallan = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challan ID",
      });
    }

    const existingChallan = await prisma.salesChallan.findUnique({
      where: { id },
    });

    if (!existingChallan) {
      return res.status(404).json({
        success: false,
        message: "Challan not found",
      });
    }

    if (existingChallan.status !== ChallanStatus.DRAFT) {
      return res.status(400).json({
        success: false,
        message: `Only draft challans can be cancelled. Current status: ${existingChallan.status}`,
      });
    }

    const challan = await prisma.salesChallan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: {
        customer: true,
        items: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Challan cancelled successfully",
      challan,
    });
  } catch (error) {
    console.error("Cancel challan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel challan",
    });
  }
};
