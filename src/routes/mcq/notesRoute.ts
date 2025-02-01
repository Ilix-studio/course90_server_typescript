import {
  createNotes,
  deleteNotes,
  getNotes,
  updateNotes,
} from "../../controllers/mcq/notesController";
import { protectAccess } from "../../middlware/authMiddleware";
import express from "express";
const router = express.Router();

// Get all the Notes Question
router.get("/get-notes", protectAccess, getNotes);

// create the Notes Question
router.post("/create-notes", protectAccess, createNotes);

// update the Notes Question
router.patch("/updateNotes/:id", protectAccess, updateNotes);

// delete the Notes Question
router.delete("/deleteNotes/:id", protectAccess, deleteNotes);

export default router;

//Short notes, long Notes,
