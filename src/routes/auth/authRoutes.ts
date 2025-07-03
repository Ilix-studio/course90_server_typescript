// routes/auth/authRoutes.ts
import express from "express";
import {
  registerAdmin,
  loginAdmin,
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  resendCreds,
  resetTeacherPassword,
  getProfile,
  updateProfile,
  loginTeacher,
} from "../../controllers/auth/authController";
import { authenticate, authPrincipal } from "../../middlware/roleMiddleware";

const router = express.Router();

// Public routes
router.post("/admin/register", registerAdmin); //
router.post("/admin/login", loginAdmin);
router.post("/teacher/login", loginTeacher);

// Principal only routes - Teacher
router.post("/teacher/create", authPrincipal, createTeacher);

router.get("/teachers", authPrincipal, getTeachers);
router.put("/teacher/:id", authPrincipal, updateTeacher);
router.delete("/teacher/:id", authPrincipal, deleteTeacher);
router.post("/teacher/:id/resend-creds", authPrincipal, resendCreds);
router.post("/teacher/:id/reset-password", authPrincipal, resetTeacherPassword);

// Protected routes for all authenticated users
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);

export default router;
