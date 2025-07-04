import {
  calculateCoursePricing,
  createCoursePricing,
  getCoursePricing,
  getPricingAnalytics,
  updateCoursePricing,
} from "../../controllers/pricing/pricingController";
import express from "express";
import { authPrincipal } from "../../middlware/roleMiddleware";

const router = express.Router();

// Principal only - Pricing management
router.post("/course", authPrincipal, createCoursePricing);
router.put("/course/:courseId", authPrincipal, updateCoursePricing);
router.get("/analytics/:instituteId", authPrincipal, getPricingAnalytics);

// Public - For pricing display and calculation
router.get("/course/:courseId", getCoursePricing);
router.post("/calculate", calculateCoursePricing);

export default router;
