import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * Public: list categories
 * GET /api/categories
 */
router.get("/", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

export default router;