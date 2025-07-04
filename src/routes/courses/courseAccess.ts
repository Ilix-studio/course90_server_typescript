import {
  checkCourseAccess,
  enrollStudent,
} from "../../controllers/course/courseAccess.controller";
import {
  getCourseEnrollments,
  getStudentEnrollments,
} from "../../controllers/pricing/pricingController";
import express from "express";
import {
  authPrincipalOrTeacher,
  authStudent,
} from "../../middlware/roleMiddleware";

const router = express.Router();

// Student access verification
router.post("/verify", authStudent, checkCourseAccess);
router.get("/student/:studentId", authStudent, getStudentEnrollments);

// Enrollment management
router.post("/enroll", enrollStudent); // Public - for payment flow
router.get("/course/:courseId", authPrincipalOrTeacher, getCourseEnrollments);

export default router;
