import { protectAccess } from "@/middlware/authMiddleware";
import { publishMockTest } from "../../controllers/mcq/feedQcontroller";
import express from "express";
const router = express.Router();

router.post("/publish", protectAccess, publishMockTest);

export default router;
