import express from "express";
import {
  generatePasskeys,
  activatePasskey,
  reactivatePasskey,
  getPackageInfo,
  calculatePrice,
  listPasskeys as getInstitutePasskeys,
  getPasskeyDetails,
  revokePasskey,
  getPasskeyAnalytics,
} from "../../controllers/passkey/passkeyController";
import {
  authPrincipal,
  authPrincipalOrTeacher,
} from "../../middlware/roleMiddleware";

const router = express.Router();

// Principal only routes
router.post("/generate", authPrincipal, generatePasskeys);
router.post("/activate", authPrincipal, activatePasskey);
router.post("/reactivate", authPrincipal, reactivatePasskey);
router.post("/revoke", authPrincipal, revokePasskey);
router.post("/calculate-price", authPrincipal, calculatePrice);

// Shared routes (Principal or Teacher)
router.get("/get-all-passkeys", authPrincipalOrTeacher, getInstitutePasskeys);
router.get("/packages", authPrincipal, getPackageInfo);
router.get("/analytics", authPrincipalOrTeacher, getPasskeyAnalytics);
router.get("/:passkeyId", authPrincipalOrTeacher, getPasskeyDetails);

export default router;
