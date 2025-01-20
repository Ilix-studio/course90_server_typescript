import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/dbConnection";

// Load environment variables
dotenv.config();

// Create Express application
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Routes

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});
// Connect to MongoDB
connectDB();
export default app;
