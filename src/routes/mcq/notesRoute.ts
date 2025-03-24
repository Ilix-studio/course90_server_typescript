import {
  addNotebody,
  createNotes,
  deleteNoteBody,
  deleteNotes,
  getNoteById,
  getNotes,
  updateNoteBody,
  updateNotes,
} from "../../controllers/mcq/notesController";
import { protectAccess } from "../../middlware/authMiddleware";
import express from "express";
const router = express.Router();

// Get all the Notes Question
router.get("/get-notes", protectAccess, getNotes);

// Get a single note by ID
router.get("/get-note/:noteSetId", protectAccess, getNoteById);

// create the Notes format
router.post("/create-notes", protectAccess, createNotes);

// update the Notes format
router.patch("/updateNotes/:noteSetId", protectAccess, updateNotes);

// delete the Notes Question
router.delete("/deleteNotes/:noteSetId", protectAccess, deleteNotes);

// create the Notes Question into Notes format or body
router.post("/add-notes/:noteSetId", protectAccess, addNotebody);

// update the Notes Question into Notes format or body
router.patch(
  "/:noteSetId/update/:noteBodySetId",
  protectAccess,
  updateNoteBody
);

// delete the Notes Question into Notes format or body
router.delete(
  "/:noteSetId/delete/:noteBodySetId",
  protectAccess,
  deleteNoteBody
);

export default router;

//Short notes, long Notes,

// http://localhost:8080/api/notes/deleteNotes/:noteSetId
