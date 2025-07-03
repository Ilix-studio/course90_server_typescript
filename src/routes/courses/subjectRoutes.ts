// routes/course/courseRoutes.ts
import {
  addSubject,
  deleteSubject,
  getSubjectsByCourse,
  updateSubject,
} from "../../controllers/course/addSubject.controller";
import {
  authPrincipal,
  authPrincipalOrTeacher,
} from "../../middlware/roleMiddleware";
import express from "express";

const router = express.Router();

// app.use("/api/v2/subjects", subjectRoutes);

// Subject routes
router.post("/:courseId/subject", authPrincipal, addSubject);
router.put("/sub/:id", authPrincipal, updateSubject);
router.delete("/sub/:id", authPrincipal, deleteSubject);
router.get("/:courseId/subjects", authPrincipalOrTeacher, getSubjectsByCourse);

export default router;
