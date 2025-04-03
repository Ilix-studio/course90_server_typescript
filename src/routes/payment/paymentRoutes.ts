import express from "express";
import {
  createPaymentOrder,
  verifyPaymentAndActivatePasskey,
} from "../../controllers/payment/paymentController";

const router = express.Router();

// Create a payment order for passkey activation
router.post("/create", createPaymentOrder);

// Verify payment and activate passkey
router.post("/verify", verifyPaymentAndActivatePasskey);

export default router;
