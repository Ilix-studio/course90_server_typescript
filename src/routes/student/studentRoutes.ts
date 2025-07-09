import { authStudent } from "../../middlware/authStudentMiddleware";
import {
  getPerformance,
  loginStudent,
  switchAccount,
  switchPasskey,
  validatePasskey,
} from "../../controllers/student/studentController2";
import express from "express";
import {
  getStudentCourses,
  getStudentProfile,
  renewPasskey,
  updateStudentProfile,
} from "../../controllers/student/studentController1";

const router = express.Router();

// Public routes
router.post("/login", loginStudent);
router.post("/validate-passkey", validatePasskey);
router.post("/switch-account", switchAccount);

// Protected routes
router.use(authStudent); // All routes below this require authentication

// Student profile routes
router.get("/profile", getStudentProfile);
router.put("/profile", updateStudentProfile);
router.get("/performance", getPerformance);

// Passkey management

router.post("/switch-passkey", switchPasskey);
router.post("/renew-passkey", renewPasskey);

// Course access
router.get("/courses", getStudentCourses);

export default router;
