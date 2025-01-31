import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/dbConnection";
import instituteRoutes from "./routes/auth/institutesRoutes";
import { errorHandler, routeNotFound } from "./middlware/errorMiddleware";
import courseRoutes from "./routes/courses/courseRoutes";
import profileRoutes from "./routes/profile/profileRoutes";

// Create Express application
const app: Application = express();
// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8080;
app.get("/", (req: Request, res: Response) => {
  res.send("server is ready");
});
app.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}`);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/institute", instituteRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/profile", profileRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});
// Connect to MongoDB
connectDB();

// Centralized Error Handler
app.use(routeNotFound);
app.use(errorHandler);
