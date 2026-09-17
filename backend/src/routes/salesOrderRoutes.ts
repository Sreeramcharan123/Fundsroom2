import { Router } from "express";
import {
  getSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  dispatchSalesOrder,
} from "../controllers/salesOrderController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", getSalesOrders);
router.get("/:id", getSalesOrderById);

// Only ADMIN can confirm (reserve inventory) and dispatch sales orders.
router.post(
  "/:id/confirm",
  authorize("ADMIN"),
  confirmSalesOrder
);

router.post(
  "/:id/dispatch",
  authorize("ADMIN"),
  dispatchSalesOrder
);

export default router;