import express from "express";
import {
  createCourse,
  deleteCourses,
  getCourses,
  updateCourses,
} from "../../controllers/course/createCourse.controller";
import { protectAccess } from "../../middlware/authMiddleware";

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

export default router;
