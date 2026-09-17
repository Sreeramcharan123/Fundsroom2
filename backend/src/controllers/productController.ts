import { Request, Response } from "express";
import prisma from "../lib/prisma";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      sku,
      category,
      unitPrice,
      currentStock,
      minStockAlert,
      warehouse,
    } = req.body;

    if (
      !name ||
      !sku ||
      !category ||
      unitPrice === undefined ||
      !warehouse
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, SKU, category, unit price and warehouse are required",
      });
    }

    if (Number(unitPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: "Unit price cannot be negative",
      });
    }

    if (Number(currentStock || 0) < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative",
      });
    }

    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists",
      });
    }

    const user = (req as any).user;
    const stock = Number(currentStock || 0);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          sku,
          category,
          unitPrice: Number(unitPrice),
          currentStock: stock,
          minStockAlert: Number(minStockAlert || 0),
          warehouse,
        },
      });

      if (stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            quantity: stock,
            type: "IN",
            reason: "Initial stock",
            createdBy: user.userId,
          },
        });
      }

      return created;
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "");
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            {
              category: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const {
      name,
      sku,
      category,
      unitPrice,
      minStockAlert,
      warehouse,
    } = req.body;

    if (sku && sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku },
      });

      if (skuExists) {
        return res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        category,
        unitPrice:
          unitPrice !== undefined ? Number(unitPrice) : undefined,
        minStockAlert:
          minStockAlert !== undefined ? Number(minStockAlert) : undefined,
        warehouse,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

export const addStock = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { quantity, reason } = req.body;
    const user = (req as any).user;

    if (!Number.isInteger(productId) || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID and positive quantity are required",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const qty = Number(quantity);

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: {
            increment: qty,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          quantity: qty,
          type: "IN",
          reason: reason || "Stock added",
          createdBy: user.userId,
        },
      });

      return updatedProduct;
    });

    return res.status(200).json({
      success: true,
      message: "Stock added successfully",
      product: result,
    });
  } catch (error) {
    console.error("Add stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add stock",
    });
  }
};

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.status(200).json({
      success: true,
      data: movements,
    });
  } catch (error) {
    console.error("Stock movements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock movements",
    });
  }
};