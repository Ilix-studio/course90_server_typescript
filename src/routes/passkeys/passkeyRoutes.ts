import {
  generatePasskeys,
  getInstitutePasskeys,
  getPasskeyDetails,
  revokePasskey,
} from "../../controllers/passkey/passkeyController";
import { protectAccess } from "../../middlware/authMiddleware";

import express from "express";

const router = express.Router();

// Institute routes - generate passkeys (requires institute authentication)
router.post("/generate-passkeys", protectAccess, generatePasskeys);

// Institute routes - get passkeys (requires institute authentication)
router.get("/get-passkeys", protectAccess, getInstitutePasskeys);

//Institute routes - get passkey Details (requires institute authentication)
router.get("/details/:passkeyId", protectAccess, getPasskeyDetails);

// Institute routes - get passkey Details (requires institute authentication)
router.post("/revoke", protectAccess, revokePasskey);

// Student routes - activate a passkey
// router.post("/activate-passkeys", activatePasskey);

// Mark an expired passkey for revival
// router.post("/mark-for-revival", markPasskeyForRevival);

// Reactivate a passkey that was marked for revival
// router.post("/reactivate", reactivatePasskey);

export default router;
