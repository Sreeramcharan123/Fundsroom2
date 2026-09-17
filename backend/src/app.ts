import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import productRoutes from "./routes/productRoutes";
import challanRoutes from "./routes/challanRoutes";
import enquiryRoutes from "./routes/enquiryRoutes";
import quotationRoutes from "./routes/quotationRoutes";
import salesOrderRoutes from "./routes/salesOrderRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "FundsRoom ERP CRM API is running 🚀",
  });
});

app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/challans", challanRoutes);
app.use("/enquiries", enquiryRoutes);
app.use("/quotations", quotationRoutes);
app.use("/sales-orders", salesOrderRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;