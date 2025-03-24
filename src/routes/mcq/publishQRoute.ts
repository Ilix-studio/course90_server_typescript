import { protectAccess } from "../../middlware/authMiddleware";
import {
  addMCQforPQ,
  deletePQ,
  getPQbyID,
  getPublishQuestions,
  publishMockTest,
  updatePQ,
  updatePQ_MCQ,
} from "../../controllers/mcq/publishQcontroller";
import express from "express";

const router = express.Router();

// Instute can publish and student will fetch in mobile apps
router.post("/publish", protectAccess, publishMockTest);

//Get Publish/Feed Question By ID
router.get("/get-publishQ/:publishQSetId", protectAccess, getPQbyID);

// Get all the Feed Question
router.get("/get-publishQ", protectAccess, getPublishQuestions);

// create the Feed Question and insert MCQ form
router.post("/add-PQ/:publishQSetId", protectAccess, addMCQforPQ);

// update the Feed Question
router.patch("/updatePQ/:publishQSetId", protectAccess, updatePQ);

// update  MCQ form
router.patch(
  "/updatePQ/:publishQSetId/mcq/:mcqId",
  protectAccess,
  updatePQ_MCQ
);

// delete the Feed Question
router.delete("/deletePQ/:publishQSetId", protectAccess, deletePQ);

export default router;

// Student can without auth
// http://localhost:8080/api/FQ/deletePQ/:publishQSetId
