import express, { Application, Request, Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";
import { prisma } from "./lib/prisma";
import { errorHandler } from "./middlewares/errorHandler";
import categoryRoutes from "./routes/category.routes";
import adminCategoryRoutes from "./routes/adminCategory.routes";
import mealRoutes from "./routes/meal.routes";
import providerRoutes from "./routes/provider.routes";
import providerMealRoutes from "./routes/providerMeal.routes";
import orderRoutes from "./routes/order.routes";
import providerOrderRoutes from "./routes/providerOrder.routes";
import reviewRoutes from "./routes/review.routes";
import onboardingRoutes from "./routes/onboarding.routes";

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

app.use(errorHandler);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminCategoryRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/provider", providerMealRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/provider", providerOrderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/onboarding", onboardingRoutes);

export default app;