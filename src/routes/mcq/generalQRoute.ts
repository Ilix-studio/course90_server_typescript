import {
  addMCQforGQ,
  createGeneralQuestions,
  deleteGQ,
  getGeneralQuestions,
  getGQbyID,
  updateGQ,
  updateGQ_MCQ,
} from "../../controllers/mcq/generalQcontroller";
import { protectAccess } from "../../middlware/authMiddleware";
import express from "express";
const router = express.Router();

// Get all the General Question
router.get("/get-generalQ", protectAccess, getGeneralQuestions);

//Get General Question By ID
router.get("/get-generalQ/:generalQSetId", protectAccess, getGQbyID);

// create the General Question
router.post("/create-generalQuestions", protectAccess, createGeneralQuestions);

// create the General Question and insert MCQ form
router.post("/add-GQ/:generalQSetId", protectAccess, addMCQforGQ);

// update the General Question
router.patch("/updateGQ/:generalQSetId", protectAccess, updateGQ);

// update  MCQ form
router.patch(
  "/updateGQ/:generalQSetId/mcq/:mcqId",
  protectAccess,
  updateGQ_MCQ
);

// delete the General Question
router.delete("/deleteGQ/:generalQSetId", protectAccess, deleteGQ);

export default router;

// http://localhost:8080/api/GQ/create-generalQuestions
