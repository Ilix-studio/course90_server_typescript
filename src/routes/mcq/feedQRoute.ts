import { protectAccess } from "../../middlware/authMiddleware";
import {
  addMCQforFQ,
  deleteFQ,
  getFeedQuestions,
  publishMockTest,
  updateFQ,
  updateFQ_MCQ,
} from "../../controllers/mcq/feedQcontroller";
import express from "express";

const router = express.Router();

// Instute can publish and student will fetch in mobile apps
router.post("/publish", protectAccess, publishMockTest);

// Get all the Feed Question
router.get("/get-feedQ", protectAccess, getFeedQuestions);

// create the Feed Question and insert MCQ form
router.post("/add-FQ/:feedQSetId", protectAccess, addMCQforFQ);

// update the Feed Question
router.patch("/updateFQ/:feedQSetId", protectAccess, updateFQ);

// update  MCQ form
router.patch("/updateFQ/:feedQSetId/mcq/:mcqId", protectAccess, updateFQ_MCQ);

// delete the Feed Question
router.delete("/deleteFQ/:feedQSetId", protectAccess, deleteFQ);

export default router;

// Student can without auth
// http://localhost:8080/api/FQ/publish
