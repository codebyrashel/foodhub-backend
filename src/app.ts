import express, { Application, Request, Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";
import { prisma } from "./lib/prisma";

const app: Application = express();

// JSON Parser
app.use(express.json());

// CORS setup
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

// Better Auth
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Health check
app.get("/health", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      message: "FoodHub API is running",
      db: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

// Simple root route
app.get("/", (req, res) => {
  res.send("Hello from FoodHub backend");
});

export default app;