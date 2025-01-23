import express from "express";
import {
  createCourse,
  loginInstitute,
  profileInstitute,
  registerInstitute,
  verifyInstitute,
} from "../../controllers/auth/institutes.controller";
import { generatePasskey } from "../../controllers/payment/passkeyControler";
import { createGeneralMCQ } from "../../controllers/mcq/generalQcontroller";
import { createMockMCQ } from "../../controllers/mcq/mockQcontroller";
import { createNote } from "../../controllers/mcq/notesController";

const router = express.Router();

// Institute registration
router.post("/register", registerInstitute);

// Institute login
router.post("/login", loginInstitute);

// Institute profile
router.get("/profile", profileInstitute);

// Verify institute with govt ID
router.post("/verify", verifyInstitute);

// Course creation
router.post("/courses", createCourse);

// Generate a passkey for a course.
router.post("/passkeys/generate", generatePasskey);

// Create a new MCQ question in general form
router.post("/courses/:courseId/generalmcqs", createGeneralMCQ);

// Create a new MCQ question in mock form.
router.post("/courses/:courseId/mockmcqs", createMockMCQ);

// Create a new long note for a course.
router.post("/courses/:courseId/notes", createNote);

export default router;
