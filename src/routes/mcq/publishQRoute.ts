import { authPrincipalOrTeacher } from "../../middlware/roleMiddleware";
import {
  addMCQforPQ,
  deletePQ,
  deletePQ_mcqId,
  getPQbyID,
  getPublishQuestions,
  publishMockTest,
  updatePQ,
  updatePQ_MCQ,
} from "../../controllers/mcq/publishQcontroller";
import express from "express";

const router = express.Router();

// Get all the Feed Question
router.get("/get-publishQ", authPrincipalOrTeacher, getPublishQuestions);

//Get Publish/Feed Question By ID
router.get("/get-publishQ/:publishQSetId", authPrincipalOrTeacher, getPQbyID);

// Instute can publish and student will fetch in mobile apps
router.post("/publish", authPrincipalOrTeacher, publishMockTest);

// create the Feed Question and insert MCQ form
router.post("/add-PQ/:publishQSetId", authPrincipalOrTeacher, addMCQforPQ);

// update the Feed Question
router.patch("/updatePQ/:publishQSetId", authPrincipalOrTeacher, updatePQ);

// update  MCQ form
router.patch(
  "/updatePQ/:publishQSetId/mcq/:mcqId",
  authPrincipalOrTeacher,
  updatePQ_MCQ
);

// delete the Feed Question
router.delete("/deletePQ/:publishQSetId", authPrincipalOrTeacher, deletePQ);

// delete the Feed Question
router.delete(
  "/deletePQ/:publishQSetId/mcq/:mcqId",
  authPrincipalOrTeacher,
  deletePQ_mcqId
);

export default router;

// Student can without auth
// http://localhost:8080/api/FQ/deletePQ/:publishQSetId
