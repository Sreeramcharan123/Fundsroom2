import { Router } from "express";

import {
  createChallan,
  getChallans,
  getChallanById,
  confirmChallan,
  cancelChallan,
} from "../controllers/challanController";

import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

// View challans
router.get("/", getChallans);
router.get("/:id", getChallanById);

// Create challan
router.post(
  "/",
  authorize("ADMIN", "SALES"),
  createChallan
);

// Confirm draft
router.post(
  "/:id/confirm",
  authorize("ADMIN", "SALES"),
  confirmChallan
);

// Cancel draft
router.post(
  "/:id/cancel",
  authorize("ADMIN", "SALES"),
  cancelChallan
);

export default router;