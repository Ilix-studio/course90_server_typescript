import {
  activatePasskey,
  generatePasskey,
  markPasskeyForRevival,
  reactivatePasskey,
} from "../../controllers/payment/passkeyControler";
import { protectAccess } from "../../middlware/authMiddleware";
import { protectStudentAccess } from "../../middlware/studentAuthMiddleware";
import express from "express";

const router = express.Router();

// Institute routes - generate passkeys (requires institute authentication)
router.post("/generate-passkeys", protectAccess, generatePasskey);

// Student routes - activate a passkey
router.post("/activate-passkeys", protectStudentAccess, activatePasskey);

// Mark an expired passkey for revival
router.post("/mark-for-revival", protectStudentAccess, markPasskeyForRevival);

// Reactivate a passkey that was marked for revival
router.post("/reactivate", protectStudentAccess, reactivatePasskey);

export default router;
