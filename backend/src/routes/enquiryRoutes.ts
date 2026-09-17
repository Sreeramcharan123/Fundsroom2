import { Router } from "express";
import {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
} from "../controllers/enquiryController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", getEnquiries);
router.get("/:id", getEnquiryById);

router.post("/", authorize("ADMIN", "SALES"), createEnquiry);

router.patch(
  "/:id/status",
  authorize("ADMIN", "SALES"),
  updateEnquiryStatus
);

export default router;