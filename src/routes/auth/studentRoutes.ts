import express from "express";
import {
  getCourses,
  getGeneralMCQs,
  getMockMCQs,
  getNotes,
  getPerformance,
  loginStudent,
  submitMCQ,
  switchAccount,
} from "@/controllers/auth/student.controller";

const router = express.Router();

// Student login with passkey
router.post("/login", loginStudent);
router.post("/switch-account", switchAccount);
// Get course content
router.get("/courses", getCourses);

// Get General MCQs for a course.
router.get("/courses/:courseId/general-mcqs", getGeneralMCQs);

//Get MOCK MCQs for a course.
router.get("/courses/:courseId/mock-mcqs", getMockMCQs);

router.get("/courses/:courseId/notes", getNotes);

// Submit an answer to an MCQ (General or MOCK).
router.post("/mcq/submit", submitMCQ);

// Get performance metrics for a student in a course.
router.get("/performance/:courseId", getPerformance);

export default router;
