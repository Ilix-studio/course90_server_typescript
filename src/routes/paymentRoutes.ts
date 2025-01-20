import express from "express";

const router = express.Router();

router.post("/payments");
router.get("/payments/:paymentId");

export default router;
