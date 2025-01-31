import express from "express";
import {
  loginInstitute,
  logoutInstitute,
  registerInstitute,
} from "../../controllers/auth/institutes.controller";

const router = express.Router();

// Institute registration
router.post("/register", registerInstitute);

// Institute login
router.post("/login", loginInstitute);

// Institute logout
router.post("/logout", logoutInstitute);

export default router;
