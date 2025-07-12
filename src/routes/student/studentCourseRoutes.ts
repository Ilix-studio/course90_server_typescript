import {
  getStudentAnalysis,
  getStudentProgress,
} from "../../controllers/student/analysisController";
import {
  submitGeneralMCQ,
  submitMockMCQ,
  submitPublishedMCQ,
} from "../../controllers/student/answerSubmitController";
import {
  getCoursesByPasskey,
  getCourseSubjects,
  getGeneralMCQs,
  getLongNotes,
  getMockMCQs,
  getPublishedMocks,
} from "../../controllers/student/studentCourseController";
import { Router } from "express";
import {
  authStudent,
  hasAccessToCourse,
} from "../../middlware/authStudentMiddleware";

const router = Router();

// Course access routes
router.get("/courses", authStudent, getCoursesByPasskey);

router.get(
  "/courses/:courseId/subjects",
  authStudent,
  hasAccessToCourse,
  getCourseSubjects
);

// MCQ content routes
router.get(
  "/courses/:courseId/general-mcqs",
  authStudent,
  hasAccessToCourse,
  getGeneralMCQs
);
router.get(
  "/courses/:courseId/mock-mcqs",
  authStudent,
  hasAccessToCourse,
  getMockMCQs
);
router.get(
  "/courses/:courseId/published-mocks",
  authStudent,
  hasAccessToCourse,
  getPublishedMocks
);
router.get(
  "/courses/:courseId/notes",
  authStudent,
  hasAccessToCourse,
  getLongNotes
);

// Answer submission routes
router.post(
  "/courses/:courseId/subjects/:subjectId/submit/general",
  authStudent,
  hasAccessToCourse,
  submitGeneralMCQ
);
router.post(
  "/:courseId/submit/mock",
  authStudent,
  hasAccessToCourse,
  submitMockMCQ
);
// may be /:courseId is not required here
router.post(
  "/submit/published",
  authStudent,
  hasAccessToCourse,
  submitPublishedMCQ
);

// Analysis routes
router.get("/analysis", authStudent, getStudentAnalysis);
router.get("/progress/:courseId", authStudent, getStudentProgress);

export default router;
