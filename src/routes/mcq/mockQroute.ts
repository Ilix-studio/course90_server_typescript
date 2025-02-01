import {
  addMCQforMQ,
  createMockQuestions,
  deleteMQ,
  getMockQuestions,
  updateMQ,
  updateMQ_MCQ,
} from "../../controllers/mcq/mockQcontroller";
import { protectAccess } from "../../middlware/authMiddleware";
import express from "express";
const router = express.Router();

// Get all the Mock Question
router.get("/get-mockQ", protectAccess, getMockQuestions);

// create the Mock Question
router.post("/create-mockQuestions", protectAccess, createMockQuestions);

// create the Mock Question and insert MCQ form
router.post("/add-MQ/:mockQSetId", protectAccess, addMCQforMQ);

// update the Mock Question
router.patch("/updateMQ/:id", protectAccess, updateMQ);

// update  MCQ form
router.patch("/updateMQ/:mockQSetId", protectAccess, updateMQ_MCQ);

// delete the Mock Question
router.delete("/deleteMQ/:id", protectAccess, deleteMQ);

export default router;
