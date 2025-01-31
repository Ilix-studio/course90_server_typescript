import express from "express";
import {
  createCourse,
  deleteCourses,
  getCourses,
  updateCourses,
} from "../../controllers/course/createCourse.controller";
import { protectAccess } from "../../middlware/authMiddleware";
import { generatePasskey } from "../../controllers/payment/passkeyControler";
import { createGeneralMCQ } from "../../controllers/mcq/generalQcontroller";
import { createMockMCQ } from "../../controllers/mcq/mockQcontroller";
import { createNote } from "../../controllers/mcq/notesController";

// Add protectAccess

const router = express.Router();

// Course creation
router.post("/createCourses", protectAccess, createCourse);

// Get Courses
router.get("/allcourses", protectAccess, getCourses);

// update Courses
router.put("/updatecourse", protectAccess, updateCourses);

// delete Courses
router.delete("/deleteCourse", protectAccess, deleteCourses);

// Generate a passkey for a course.
router.post("/passkeys/generate", protectAccess, generatePasskey);

// Create a new MCQ question in general form
router.post("/:courseId/generalmcqs", protectAccess, createGeneralMCQ);

// Create a new MCQ question in mock form.
router.post("/:courseId/mockmcqs", protectAccess, createMockMCQ);

// Create a new long note for a course.
router.post("/:courseId/notes", protectAccess, createNote);

export default router;
