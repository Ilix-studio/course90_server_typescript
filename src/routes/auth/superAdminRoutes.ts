import {
  getAllInstitutes,
  getAllTeachers,
  getDashboardAnalytics,
  getSuperAdminProfile,
  loginSuperAdmin,
  logoutSuperAdmin,
  toggleInstituteStatus,
} from "../../controllers/auth/superAdminController";
import {
  ensureSuperAdmin,
  protectSuperAdmin,
} from "../../middlware/superAdminAuth";
import express from "express";

const router = express.Router();

// Public routes
router.post("/login", loginSuperAdmin);

// Protected routes (SuperAdmin only)
router.use(protectSuperAdmin, ensureSuperAdmin);

router.post("/logout", logoutSuperAdmin);
router.get("/profile", getSuperAdminProfile);
router.get("/dashboard", getDashboardAnalytics);
router.get("/institutes", getAllInstitutes);
router.get("/teachers", getAllTeachers);
router.put("/institute/:id/toggle-status", toggleInstituteStatus);

export default router;
