import express from "express";

import {
  getPerformance,
  loginStudent,
  renewPasskey,
  switchAccount,
  validatePasskey,
} from "../../controllers/student/studentController2";
import {
  getGeneralMCQs,
  getMockMCQs,
} from "controllers/student/studentCourseController";
import { getNotes } from "controllers/mcq/notesController";
import {
  submitGeneralMCQ,
  submitMockMCQ,
  submitPublishedMCQ,
} from "controllers/student/answerSubmitController";

const router = express.Router();

// Student login with passkey
router.post("/studentlogin", loginStudent);
router.post("/switch-account", switchAccount);

// Student routes
router.post("/validate", validatePasskey);

// Student Routes
router.post("/renew", renewPasskey);

// Get course content
router.get("/courses");

// Get General/Mock/Notes MCQs for a course.
router.get("/courses/:courseId/general-mcqs", getGeneralMCQs);
router.get("/courses/:courseId/mock-mcqs", getMockMCQs);
router.get("/courses/:courseId/notes", getNotes);

//Get publish MCQs from all the institutes.
// router.get("/feed", getFeedMockTests);
router.post("/mcq/publish/submit", submitPublishedMCQ);

// Submit an answer to an MCQ (General or MOCK).
router.post("/mcq/GQ/submit", submitGeneralMCQ);
router.post("/mcq/MQ/submit", submitMockMCQ);

// Get performance metrics for a student in a course.
router.get("/performance/:courseId", getPerformance);

export default router;
