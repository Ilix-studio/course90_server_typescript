import { authPrincipal } from "../../middlware/roleMiddleware";
import {
  createInstituteProfile,
  deleteInstituteProfile,
  getInstituteProfile,
  updateInstituteProfile,
} from "../../controllers/profile/instituteprofile.controller";

import express from "express";

const router = express.Router();

// /api/profile
// Institute profile operations - only principals can manage their institute profiles

// Create a new profile
router.post("/createProfile", authPrincipal, createInstituteProfile);

// Get profile
router.get("/getProfile", authPrincipal, getInstituteProfile);

// Update profile
router.put("/updateProfile", authPrincipal, updateInstituteProfile);

// Delete profile
router.delete("/deleteProfile", authPrincipal, deleteInstituteProfile);

export default router;
