import { Router } from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  addFollowUp,
} from "../controllers/customerController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", getCustomers);
router.get("/:id", getCustomerById);

router.post(
  "/",
  authorize("ADMIN", "SALES"),
  createCustomer
);

router.put(
  "/:id",
  authorize("ADMIN", "SALES"),
  updateCustomer
);

router.post(
  "/:id/follow-ups",
  authorize("ADMIN", "SALES"),
  addFollowUp
);

export default router;