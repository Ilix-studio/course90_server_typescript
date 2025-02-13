import { protectAccess } from "../../middlware/authMiddleware";
import {
  addMCQforPQ,
  deletePQ,
  getPublishQuestions,
  publishMockTest,
  updatePQ,
  updatePQ_MCQ,
} from "../../controllers/mcq/publishQcontroller";
import express from "express";

const router = express.Router();

// Instute can publish and student will fetch in mobile apps
router.post("/publish", protectAccess, publishMockTest);

// Get all the Feed Question
router.get("/get-feedQ", protectAccess, getPublishQuestions);

// create the Feed Question and insert MCQ form
router.post("/add-FQ/:publishQSetId", protectAccess, addMCQforPQ);

// update the Feed Question
router.patch("/updateFQ/:publishQSetId", protectAccess, updatePQ);

// update  MCQ form
router.patch(
  "/updateFQ/:publishQSetId/mcq/:mcqId",
  protectAccess,
  updatePQ_MCQ
);

// delete the Feed Question
router.delete("/deleteFQ/:publishQSetId", protectAccess, deletePQ);

export default router;

// Student can without auth
// http://localhost:8080/api/FQ/publish
