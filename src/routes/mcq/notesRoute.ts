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
router.patch("/updateNotes/:noteSetId", protectAccess, updateNotes);

// delete the Notes Question
router.delete("/deleteNotes/:noteSetId", protectAccess, deleteNotes);

export default router;

//Short notes, long Notes,

// http://localhost:8080/api/notes/create-notes
