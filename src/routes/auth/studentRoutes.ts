import express from "express";
import {
  getCourses,
  getPerformance,
  loginStudent,
  switchAccount,
} from "../../controllers/student/studentAuth.controller";
import {
  getGeneralMCQs,
  submitGeneralMCQ,
} from "../../controllers/student/getGmcqsController";
import {
  getMockMCQs,
  submitMockMCQ,
} from "../../controllers/student/getMmcqsController";
import { getNotes } from "../../controllers/student/getNoteController";
import { getFeedMockTests } from "../../controllers/mcq/feedQcontroller";
import { submitPublishedMCQ } from "../../controllers/student/getPublishQcontroller";

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

//Get publish MCQs from all the institutes.
router.get("/feed", getFeedMockTests);
router.post("/mcq/publish/submit", submitPublishedMCQ);

// Submit an answer to an MCQ (General or MOCK).
router.post("/mcq/GQ/submit", submitGeneralMCQ);
router.post("/mcq/MQ/submit", submitMockMCQ);

router.post("/mcq/MQ/submit", submitMockMCQ);

// Get performance metrics for a student in a course.
router.get("/performance/:courseId", getPerformance);

export default router;
