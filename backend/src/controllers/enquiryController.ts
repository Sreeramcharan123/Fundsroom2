import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { EnquiryStatus } from "@prisma/client";
import { generateNumber } from "../utils/quoteCalc";

export const createEnquiry = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { customerId, items, notes } = req.body;

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

    for (const item of items) {
      if (
        !Number.isInteger(Number(item.productId)) ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a valid product and positive quantity",
        });
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { id: Number(customerId) },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const productIds = items.map((item: any) => Number(item.productId));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more products were not found",
      });
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNumber: generateNumber("ENQ"),
        customerId: Number(customerId),
        createdBy: user.userId,
        notes,
        items: {
          create: items.map((item: any) => {
            const product = products.find((p) => p.id === Number(item.productId));
            return {
              productId: product!.id,
              productName: product!.name,
              sku: product!.sku,
              quantity: Number(item.quantity),
            };
          }),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      enquiry,
    });
  } catch (error) {
    console.error("Create enquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create enquiry",
    });
  }
};

export const getEnquiries = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "");
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const where = search
      ? {
          OR: [
            {
              enquiryNumber: {
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

    const [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        include: {
          customer: true,
          items: true,
          quotations: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.enquiry.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: enquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get enquiries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enquiries",
    });
  }
};

export const getEnquiryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID",
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        quotations: true,
      },
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      enquiry,
    });
  } catch (error) {
    console.error("Get enquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enquiry",
    });
  }
};

export const updateEnquiryStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID",
      });
    }

    const allowed = Object.values(EnquiryStatus);
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid enquiry status is required",
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: { quotations: true },
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const transitions: Record<string, string[]> = {
      NEW: ["QUOTED"],
      QUOTED: ["WON", "LOST"],
      WON: [],
      LOST: [],
    };

    if (!transitions[enquiry.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change enquiry from ${enquiry.status} to ${status}`,
      });
    }

    const updated = await prisma.enquiry.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        items: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Enquiry status updated successfully",
      enquiry: updated,
    });
  } catch (error) {
    console.error("Update enquiry status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update enquiry status",
    });
  }
};