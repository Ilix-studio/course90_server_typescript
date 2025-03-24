import {
  addMCQforMQ,
  createMockQuestions,
  deleteMQ,
  getMockQuestions,
  getMQbyID,
  updateMQ,
  updateMQ_MCQ,
} from "../../controllers/mcq/mockQcontroller";
import { protectAccess } from "../../middlware/authMiddleware";
import express from "express";
const router = express.Router();

// Get all the Mock Question
router.get("/get-mockQ", protectAccess, getMockQuestions);

//Get Mock Question By ID
router.get("/get-mockQ/:mockQSetId", protectAccess, getMQbyID);

// create the Mock Question
router.post("/create-mockQuestions", protectAccess, createMockQuestions);

// create the Mock Question and insert MCQ form
router.post("/add-MQ/:mockQSetId", protectAccess, addMCQforMQ);

// update the Mock Question
router.patch("/updateMQ/:mockQSetId", protectAccess, updateMQ);

// update  MCQ form
router.patch("/updateMQ/:mockQSetId/mcq/:mcqId", protectAccess, updateMQ_MCQ);

// delete the Mock Question
router.delete("/deleteMQ/:mockQSetId", protectAccess, deleteMQ);

export default router;

// http://localhost:8080/api/MQ//deleteMQ/:mockQSetId
