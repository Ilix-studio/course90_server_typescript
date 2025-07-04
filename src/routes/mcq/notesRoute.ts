import {
  authPrincipalOrTeacher,
  checkTeacherPermissions,
} from "../../middlware/roleMiddleware";
import {
  addNotebody,
  createNotes,
  deleteNoteBody,
  deleteNoteBody_SetId,
  deleteNotes,
  getNoteById,
  getNotes,
  updateNote_SetId,
  updateNoteBody,
  updateNotes,
} from "../../controllers/mcq/notesController";

import express from "express";
const router = express.Router();

// Get all the Notes Question
router.get("/get-notes", authPrincipalOrTeacher, getNotes);

// Get a single note by ID
router.get("/get-note/:noteSetId", authPrincipalOrTeacher, getNoteById);

// create the Notes format
router.post(
  "/create-notes",
  authPrincipalOrTeacher,
  checkTeacherPermissions(["create:long_notes"]),
  createNotes
);

// update the Notes format
router.patch("/updateNotes/:noteSetId", authPrincipalOrTeacher, updateNotes);

// delete the Notes Question
router.delete("/deleteNotes/:noteSetId", authPrincipalOrTeacher, deleteNotes);

// create the Notes Question into Notes format or body
router.post("/add-notes/:noteSetId", authPrincipalOrTeacher, addNotebody);

// update the Notes Question into Notes format or body
router.patch("/:noteSetId", authPrincipalOrTeacher, updateNoteBody);

// update the Notes Question into Notes format or body
router.patch(
  "/:noteSetId/update/:noteBodySetId",
  authPrincipalOrTeacher,
  updateNote_SetId
);

// delete the Notes Question into Notes format or body
router.delete("/:noteSetId", authPrincipalOrTeacher, deleteNoteBody);

router.delete(
  "/:noteSetId/delete/:noteBodySetId",
  authPrincipalOrTeacher,
  deleteNoteBody_SetId
);

export default router;

//Short notes, long Notes,

// http://localhost:8080/api/notes/deleteNotes/:noteSetId
