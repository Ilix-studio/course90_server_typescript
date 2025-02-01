import express from "express";
import {
  createCourse,
  deleteCourses,
  getCourses,
  updateCourses,
} from "../../controllers/course/createCourse.controller";
import { protectAccess } from "../../middlware/authMiddleware";
import { generatePasskey } from "../../controllers/payment/passkeyControler";
// import { createGeneralMCQ } from "../../controllers/mcq/generalQcontroller";
// import { createMockMCQ } from "../../controllers/mcq/mockQcontroller";
// import { createNote } from "../../controllers/mcq/notesController";

// Add protectAccess

const router = express.Router();

// Course creation
router.post("/createCourses", protectAccess, createCourse);

// Get Courses
router.get("/allcourses", protectAccess, getCourses);

// router.get('/:courseId', protectAccess, getCourse);

// update Courses
router.put("/updatecourse/:courseId", protectAccess, updateCourses);

// delete Courses
router.delete("/deleteCourse/:courseId", protectAccess, deleteCourses);

// Generate a passkey for a course.
router.post("/passkeys/generate", protectAccess, generatePasskey);

export default router;
