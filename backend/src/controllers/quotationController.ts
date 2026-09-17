import { Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  QuotationStatus,
  EnquiryStatus,
} from "@prisma/client";
import {
  calculateQuoteTotals,
  generateNumber,
} from "../utils/quoteCalc";

export const createQuotation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { enquiryId, validUntil, notes } = req.body;
    const items = req.body.items;

    if (!Number.isInteger(Number(enquiryId))) {
      return res.status(400).json({
        success: false,
        message: "A valid enquiry is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one quotation item is required",
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: Number(enquiryId) },
      include: { items: true },
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const productIds = items.map((item: any) => Number(item.productId));

    for (const id of productIds) {
      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Each item must reference a valid product",
        });
      }
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more products were not found",
      });
    }

    const calcInputs = items.map((item: any) => {
      const product = products.find(
        (p) => p.id === Number(item.productId)
      );

      if (!product) {
        throw new Error("Product not found");
      }

      const quantity = Number(item.quantity);
      const discountPct = Number(item.discountPct || 0);
      const gstPct = Number(item.gstPct || 0);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(
          `Invalid quantity for ${product.name}. Must be a positive whole number`
        );
      }

      if (discountPct < 0 || discountPct > 100) {
        throw new Error("Discount percentage must be between 0 and 100");
      }

      if (gstPct < 0 || gstPct > 100) {
        throw new Error("GST percentage must be between 0 and 100");
      }

      return {
        product: product,
        quantity: quantity,
        unitPrice: Number(product.unitPrice),
        discountPct,
        gstPct,
      };
    });

    // Backend always computes totals. Client-sent totals are ignored.
    const totals = calculateQuoteTotals(calcInputs);

    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          quotationNumber: generateNumber("QUO"),
          enquiryId: Number(enquiryId),
          customerId: enquiry.customerId,
          status: QuotationStatus.DRAFT,
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          totalGst: totals.totalGst,
          grandTotal: totals.grandTotal,
          validUntil: validUntil ? new Date(validUntil) : undefined,
          notes,
          createdBy: user.userId,
          items: {
            create: totals.items.map((item, index) => {
              const calcInput = calcInputs[index];
              return {
                productId: calcInput.product.id,
                productName: calcInput.product.name,
                sku: calcInput.product.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct,
                gstPct: item.gstPct,
                baseAmount: item.baseAmount,
                discountAmount: item.discountAmount,
                gstAmount: item.gstAmount,
                lineTotal: item.lineTotal,
              };
            }),
          },
        },
        include: {
          customer: true,
          enquiry: true,
          items: true,
        },
      });

      if (enquiry.status === EnquiryStatus.NEW) {
        await tx.enquiry.update({
          where: { id: enquiry.id },
          data: { status: EnquiryStatus.QUOTED },
        });
      }

      return created;
    }, { maxWait: 15000, timeout: 30000 });

    return res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      quotation,
    });
  } catch (error: any) {
    console.error("Create quotation error:", error);

    if (error.message && error.message.toLowerCase().includes("quantity")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create quotation",
    });
  }
};

export const getQuotations = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "");
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const where = search
      ? {
          OR: [
            {
              quotationNumber: {
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

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          customer: true,
          enquiry: true,
          items: { include: { product: true } },
          salesOrders: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quotation.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get quotations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotations",
    });
  }
};

export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        enquiry: {
          include: { customer: true, items: true },
        },
        items: { include: { product: true } },
        salesOrders: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    return res.status(200).json({
      success: true,
      quotation,
    });
  } catch (error) {
    console.error("Get quotation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotation",
    });
  }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const allowed = Object.values(QuotationStatus);
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "A valid quotation status is required",
      });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const transitions: Record<string, string[]> = {
      DRAFT: ["SENT"],
      SENT: ["ACCEPTED", "REJECTED"],
      ACCEPTED: [],
      REJECTED: [],
    };

    if (!transitions[quotation.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change quotation from ${quotation.status} to ${status}. Allowed: ${transitions[quotation.status].join(", ") || "none"}`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.quotation.update({
        where: { id },
        data: { status },
        include: {
          customer: true,
          enquiry: true,
          items: true,
          salesOrders: true,
        },
      });

      if (status === QuotationStatus.ACCEPTED) {
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: EnquiryStatus.WON },
        });
      } else if (status === QuotationStatus.REJECTED) {
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: EnquiryStatus.LOST },
        });
      }

      return result;
    }, { maxWait: 15000, timeout: 30000 });

    return res.status(200).json({
      success: true,
      message: `Quotation marked as ${status}`,
      quotation: updated,
    });
  } catch (error) {
    console.error("Update quotation status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update quotation status",
    });
  }
};

export const convertQuotationToSalesOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true, salesOrders: true },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    if (quotation.status !== QuotationStatus.ACCEPTED) {
      return res.status(400).json({
        success: false,
        message: `Only ACCEPTED quotations can be converted to Sales Orders. Current status: ${quotation.status}`,
      });
    }

    if (quotation.salesOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This quotation has already been converted to a Sales Order",
      });
    }

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: generateNumber("SO"),
        quotationId: quotation.id,
        customerId: quotation.customerId,
        status: "PENDING",
        subtotal: quotation.subtotal,
        totalDiscount: quotation.totalDiscount,
        totalGst: quotation.totalGst,
        grandTotal: quotation.grandTotal,
        createdBy: user.userId,
        items: {
          create: quotation.items.map((item) => ({
            quotationItemId: item.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
            gstPct: item.gstPct,
            baseAmount: item.baseAmount,
            discountAmount: item.discountAmount,
            gstAmount: item.gstAmount,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: {
        customer: true,
        quotation: true,
        items: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Sales Order created successfully from quotation",
      salesOrder,
    });
  } catch (error: any) {
    console.error("Convert quotation error:", error);

    if (
      error?.code === "P2002" &&
      String(error.meta?.target || "").includes("quotationId")
    ) {
      return res.status(400).json({
        success: false,
        message: "This quotation has already been converted to a Sales Order",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to convert quotation to Sales Order",
    });
  }
};