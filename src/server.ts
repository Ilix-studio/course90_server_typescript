import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/dbConnection";
import instituteRoutes from "./routes/auth/institutesRoutes";
import { errorHandler, routeNotFound } from "./middlware/errorMiddleware";
import courseRoutes from "./routes/courses/courseRoutes";
import profileRoutes from "./routes/profile/profileRoutes";
import generalRoutes from "./routes/mcq/generalQRoute";
import mockRoutes from "./routes/mcq/mockQroute";
import publishRoutes from "./routes/mcq/publishQRoute";
import notesRoutes from "./routes/mcq/notesRoute";
import passkeyRoutes from "./routes/passkeys/passkeyRoutes";
// import paymentRoutes from "./routes/payment/paymentRoutes";
import studentRoutes from "./routes/auth/studentRoutes";
import corsOptions from "./config/corsOptions";

// Create Express application
const app: Application = express();
dotenv.config();

const PORT = process.env.PORT || 8080;

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (add this before other routes)
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("server is ready");
});
app.get("/_ah/health", (req: Request, res: Response) => {
  res.status(200).send("server is ready");
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

app.use("/api/institute", instituteRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/GQ", generalRoutes);
app.use("/api/MQ", mockRoutes);
app.use("/api/PQ", publishRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/passkeys", passkeyRoutes);
// app.use("/api/payments", paymentRoutes);
app.use("/api/student", studentRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Centralized Error Handler
app.use(routeNotFound);
app.use(errorHandler);

// Connect to MongoDB
connectDB();
