import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  addStock,
  getStockMovements,
} from "../controllers/productController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", getProducts);
router.get("/stock-movements", getStockMovements);
router.get("/:id", getProductById);

router.post(
  "/",
  authorize("ADMIN", "WAREHOUSE"),
  createProduct
);

router.put(
  "/:id",
  authorize("ADMIN", "WAREHOUSE"),
  updateProduct
);

router.post(
  "/:id/stock",
  authorize("ADMIN", "WAREHOUSE"),
  addStock
);

export default router;