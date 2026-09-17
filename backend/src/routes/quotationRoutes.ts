import { Router } from "express";
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationStatus,
  convertQuotationToSalesOrder,
} from "../controllers/quotationController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", getQuotations);
router.get("/:id", getQuotationById);

router.post("/", authorize("ADMIN", "SALES"), createQuotation);

router.patch(
  "/:id/status",
  authorize("ADMIN", "SALES"),
  updateQuotationStatus
);

router.post(
  "/:id/convert",
  authorize("ADMIN", "SALES"),
  convertQuotationToSalesOrder
);

export default router;