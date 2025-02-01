import { protectAccess } from "../../middlware/authMiddleware";
import {
  addMCQforFQ,
  createFeedQuestions,
  deleteFQ,
  getFeedQuestions,
  publishMockTest,
  updateFQ,
  updateFQ_MCQ,
} from "../../controllers/mcq/feedQcontroller";
import express from "express";
const router = express.Router();

router.post("/publish", protectAccess, publishMockTest);

// Get all the Feed Question
router.get("/get-feedQ", getFeedQuestions);

// create the Feed Question
router.post("/create-feedQ", protectAccess, createFeedQuestions);

// create the Feed Question and insert MCQ form
router.post("/add-FQ/:feedQSetId", protectAccess, addMCQforFQ);

// update the Feed Question
router.patch("/updateFQ/:id", protectAccess, updateFQ);

// update  MCQ form
router.patch("/updateFQ/:generalQSetId", protectAccess, updateFQ_MCQ);

// delete the Feed Question
router.delete("/deleteFQ/:id", protectAccess, deleteFQ);

export default router;

// Student can without auth
