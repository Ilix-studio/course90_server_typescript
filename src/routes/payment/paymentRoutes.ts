import express from "express";
import { protectAccess } from "../../middlware/authMiddleware";

import {
  createOrder,
  verifyPayment,
} from "../../controllers/payment/paymentController";

const router = express.Router();

// Public routes (for students)
router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);

// Protected routes (for institutes)
// router.get("/history/:instituteId", protectAccess, getPaymentHistory);

export default router;
