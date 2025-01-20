import express from "express";
import {
  createCourse,
  createGeneralMCQ,
  createMockMCQ,
  createNote,
  generatePasskey,
  loginInstitute,
  profileInstitute,
  registerInstitute,
  verifyInstitute,
} from "@/controllers/institutes.controller";

const router = express.Router();

// Institute registration and login
router.post("/register", registerInstitute);
router.post("/login", loginInstitute);
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
