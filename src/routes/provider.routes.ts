import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../middlewares/errorHandler";

const router = Router();

/**
 * Public: list providers
 * GET /api/providers
 */
router.get("/", async (req, res, next) => {
  try {
    const providers = await prisma.user.findMany({
      where: { role: "provider", status: "active" },
      select: {
        id: true,
        name: true,
        image: true,
        providerProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(providers);
  } catch (err) {
    next(err);
  }
});

/**
 * Public: provider details with menu
 * GET /api/providers/:id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const providerId = req.params.id;

    const provider = await prisma.user.findFirst({
      where: { id: providerId, role: "provider", status: "active" },
      select: {
        id: true,
        name: true,
        image: true,
        providerProfile: true,
        meals: {
          where: { isAvailable: true },
          orderBy: { createdAt: "desc" },
          include: { category: true },
        },
      },
    });

    if (!provider) throw new ApiError(404, "Provider not found");
    res.json(provider);
  } catch (err) {
    next(err);
  }
});

export default router;