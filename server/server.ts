import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import socialAuthRouter from "./routes/socialAuth.routes.js";
import accountRouter from "./routes/account.routes.js";
import postRouter from "./routes/post.routes.js";
import activityRouter from "./routes/activity.routes.js";
import { initScheduler } from "./services/schedulerService.js";
import { cloudinary } from "./config/cloudinary.js";

const app = express();

// Database connection
await connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.VITE_API_BASE_URL, // your live frontend URL
    credentials: true,
  }),
);
app.use(express.json());

// ================= DEBUG LOGGER =================
app.use((req: Request, res: Response, next: NextFunction) => {
  next();
});
// ================================================

const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});

app.use("/api/auth", authRouter);
app.use("/api/oauth", socialAuthRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/posts", postRouter);
app.use("/api/activity", activityRouter);

// Initialize Scheduler
initScheduler();

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("GLOBAL ERROR:", err);

  res.status(500).json({
    message: err?.response?.data?.message || err?.message,
  });
});

app.get("/test-cloudinary", async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
