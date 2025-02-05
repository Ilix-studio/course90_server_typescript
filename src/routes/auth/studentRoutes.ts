import express from "express";

import {
  getGeneralMCQs,
  submitGeneralMCQ,
} from "../../controllers/student/getGmcqsController";
import {
  getMockMCQs,
  submitMockMCQ,
} from "../../controllers/student/getMmcqsController";
import { getNotes } from "../../controllers/student/getNoteController";

import {
  getFeedMockTests,
  submitPublishedMCQ,
} from "../../controllers/student/getPublishQcontroller";
import {
  getPerformance,
  loginStudent,
  switchAccount,
} from "../../controllers/auth/studentAuthcontroller";
import { getCourses } from "../../controllers/course/createCourse.controller";

const router = express.Router();

// Student login with passkey
router.post("/studentlogin", loginStudent);
router.post("/switch-account", switchAccount);

// Get course content
router.get("/courses");

// Get General/Mock/Notes MCQs for a course.
router.get("/courses/:courseId/general-mcqs", getGeneralMCQs);
router.get("/courses/:courseId/mock-mcqs", getMockMCQs);
router.get("/courses/:courseId/notes", getNotes);

//Get publish MCQs from all the institutes.
router.get("/feed", getFeedMockTests);
router.post("/mcq/publish/submit", submitPublishedMCQ);

// Submit an answer to an MCQ (General or MOCK).
router.post("/mcq/GQ/submit", submitGeneralMCQ);
router.post("/mcq/MQ/submit", submitMockMCQ);

// Get performance metrics for a student in a course.
router.get("/performance/:courseId", getPerformance);

export default router;

// http://localhost:8080/studentlogin
// http://localhost:8080/switch-account
// http://localhost:8080/courses
// http://localhost:8080/courses/:courseId/general-mcqs
// http://localhost:8080/courses/:courseId/mock-mcqs
// http://localhost:8080/courses/:courseId/notes
// http://localhost:8080/feed
// http://localhost:8080/mcq/publish/submit
// http://localhost:8080/mcq/MQ/submit
// http://localhost:8080/mcq/FQ/submit
// http://localhost:8080/performance/:courseId
