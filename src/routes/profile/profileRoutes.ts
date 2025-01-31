import {
  createInstituteProfile,
  deleteInstituteProfile,
  getInstituteProfile,
  updateInstituteProfile,
} from "../../controllers/profile/instituteprofile.controller";
import { protectAccess } from "../../middlware/authMiddleware";
import express from "express";

const router = express.Router();
// /api/profile
// Create a new profile
router.post("/createProfile", protectAccess, createInstituteProfile);

// Get profile
router.get("/getProfile", protectAccess, getInstituteProfile);

// Update profile
router.put("/updateProfile", protectAccess, updateInstituteProfile);

// Delete profile
router.delete("/deleteProfile", protectAccess, deleteInstituteProfile);

export default router;
