import {
  authPrincipalOrTeacher,
  checkTeacherPermissions,
} from "../../middlware/roleMiddleware";
import {
  addMCQforGQ,
  createGeneralQuestions,
  deleteGQ,
  deleteGQ_mcqId,
  getGeneralQuestions,
  getGQbyID,
  updateGQ,
  updateGQ_MCQ,
} from "../../controllers/mcq/generalQcontroller";

import express from "express";
const router = express.Router();

// Get all the General Question
router.get("/gGQ", authPrincipalOrTeacher, getGeneralQuestions);

//Get General Question By ID
router.get("/gGQ/:generalQSetId", authPrincipalOrTeacher, getGQbyID);

// create the General Question
router.post(
  "/cGQ",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["create:generalQ"]),
  createGeneralQuestions
);

// create the General Question and insert MCQ form
router.post(
  "/aGQ/:generalQSetId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["create:generalQ-id"]),
  addMCQforGQ
);

// update the General Question
router.patch(
  "/uGQ/:generalQSetId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["update:generalQ"]),
  updateGQ
);

// update  MCQ form
router.patch(
  "/uGQ/:generalQSetId/mcq/:mcqId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["update:generalQ-id/mcq-id"]),
  updateGQ_MCQ
);

// delete the General Question
router.delete(
  "/dGQ/:generalQSetId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["delete:generalQ"]),
  deleteGQ
);
router.delete(
  "/dGQ/:generalQSetId/mcq/:mcqId",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["delete:generalQ-id/mcq-id"]),
  deleteGQ_mcqId
);

export default router;

// http://localhost:8080/api/GQ/create-generalQuestions
