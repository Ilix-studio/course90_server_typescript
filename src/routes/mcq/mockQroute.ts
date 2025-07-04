import {
  authPrincipalOrTeacher,
  checkTeacherPermissions,
} from "../../middlware/roleMiddleware";
import {
  addMCQforMQ,
  createMockQuestions,
  deleteMQ,
  deleteMQ_mcqId,
  getMockQuestions,
  getMQbyID,
  updateMQ,
  updateMQ_MCQ,
} from "../../controllers/mcq/mockQcontroller";

import express from "express";
const router = express.Router();

// Get all the Mock Question
router.get("/get-mockQ", authPrincipalOrTeacher, getMockQuestions);

//Get Mock Question By ID
router.get("/get-mockQ/:mockQSetId", authPrincipalOrTeacher, getMQbyID);

// create the Mock Question
router.post(
  "/create-mockQuestions",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["create:mockQ"]),
  createMockQuestions
);

// create the Mock Question and insert MCQ form
router.post(
  "/add-MQ/:mockQSetId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["create:mockQ-id"]),
  addMCQforMQ
);

// update the Mock Question
router.patch(
  "/updateMQ/:mockQSetId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["update:mockQ"]),
  updateMQ
);

// update  MCQ form
router.patch(
  "/updateMQ/:mockQSetId/mcq/:mcqId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["update:mockQ-id/mcq-id"]),
  updateMQ_MCQ
);

// delete the Mock Question
router.delete(
  "/deleteMQ/:mockQSetId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["delete:mockQ"]),
  deleteMQ
);
router.delete(
  "/deleteMQ/:mockQSetId/mcq/:mcqId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["delete:mockQ-id/mcq-id"]),
  deleteMQ_mcqId
);

export default router;
