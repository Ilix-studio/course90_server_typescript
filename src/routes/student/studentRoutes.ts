// routes/student/studentRoutes.ts
import {
  getStudentCourses,
  updateStudentProfile,
} from "../../controllers/student/studentController";
import {
  getPerformance,
  loginStudent,
  renewPasskey,
  switchAccount,
  validatePasskey,
} from "../../controllers/student/studentAuthcontroller";

import express from "express";

const router = express.Router();

// Public student routes
router.post("/login", loginStudent);

// Protected student routes
router.post("/validate", validatePasskey);
router.post("/switch-passkey", switchAccount);
router.put("/profile", updateStudentProfile);
router.get("/courses", getStudentCourses);
// router.post("/submit-answers", submitAnswers);
router.get("/progress", getPerformance);
router.post("/renew", renewPasskey);

export default router;
// authenticateStudent check valid passkey login to one device
