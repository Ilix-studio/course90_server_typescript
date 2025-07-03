// routes/course/courseRoutes.ts
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourses,
  updateCourse,
} from "../../controllers/course/course.controller";
import {
  authPrincipal,
  authPrincipalOrTeacher,
} from "../../middlware/roleMiddleware";
import express from "express";

const router = express.Router();

// app.use("/api/v2/courses", courseRoutes);

// Course routes
router.post("/create", authPrincipal, createCourse);
router.get("/", authPrincipalOrTeacher, getCourses);
router.get("/:id", authPrincipalOrTeacher, getCourse);
router.put("/:id", authPrincipal, updateCourse);
router.delete("/:id", authPrincipal, deleteCourse);

export default router;
