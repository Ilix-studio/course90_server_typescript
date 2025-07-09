import dotenv from "dotenv";
dotenv.config();
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import corsOptions from "./config/corsOptions";

import authRoutes from "./routes/auth/authRoutes";
import superAdminRoutes from "./routes/auth/superAdminRoutes";
import courseRoutes from "./routes/courses/courseRoutes";
import subjectRoutes from "./routes/courses/subjectRoutes";
import generalRoutes from "./routes/mcq/generalQRoute";
import mockRoutes from "./routes/mcq/mockQroute";
import publishRoutes from "./routes/mcq/publishQRoute";
import notesRoutes from "./routes/mcq/notesRoute";

import pricingRoutes from "./routes/pricing/pricingRoutes";
import passkeysRoutes from "./routes/passkeys/passkeyRoutes";
import paymentsRoutes from "./routes/payment//paymentRoutes";
import studentsRoutes from "./routes/student/studentRoutes";
import courseAccessRoutes from "./routes/courses/courseAccess";

import profileRoutes from "./routes/profile/profileRoutes";

import connectDB from "./config/dbConnection";
import { errorHandler, routeNotFound } from "./middlware/errorMiddleware";

// Create Express application
export const app: Application = express();

const PORT = process.env.PORT || 8080;

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint (add this before other routes)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Course90 Platform API Server is running",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});
app.get("/_ah/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});
app.get("/_ah/start", (req: Request, res: Response) => {
  res.status(200).send("OK");
});
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});
app.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}`);
});
// API Routes - New Role-Based System (part1)
app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/superadmin", superAdminRoutes);
app.use("/api/v2/courses", courseRoutes);
app.use("/api/v2/subjects", subjectRoutes);
app.use("/api/v2/GQ", generalRoutes);
app.use("/api/v2/MQ", mockRoutes);
app.use("/api/v2/PQ", publishRoutes);
app.use("/api/v2/notes", notesRoutes);
// (part2)
app.use("/api/v2/pricing", pricingRoutes);
app.use("/api/v2/passkeys", passkeysRoutes);
app.use("/api/v2/payments", paymentsRoutes);
// (part3)
app.use("/api/v2/students", studentsRoutes);
app.use("/api/v2/courseAccess", courseAccessRoutes);
// (part4)
app.use("/api/v2/profile", profileRoutes);
// (Student and Insitute profile)

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error handler:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(500).json({
    success: false,
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Centralized Error Handler
app.use(routeNotFound);
app.use(errorHandler);

// Connect to MongoDB
connectDB();
