import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import { updateProviderProfileSchema } from "../validators/profile.validators";

const router = Router();

router.use(requireAuth, requireRole(["provider"]));

/**
 * Provider: get own provider profile
 * GET /api/provider/me/profile
 */
router.get("/me/profile", async (req: any, res, next) => {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) throw new ApiError(404, "Provider profile not found");
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

/**
 * Provider: update own provider profile
 * PATCH /api/provider/me/profile
 */
router.patch("/me/profile", async (req: any, res, next) => {
  try {
    const parsed = updateProviderProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());

    const updated = await prisma.providerProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(parsed.data.restaurantName !== undefined
          ? { restaurantName: parsed.data.restaurantName }
          : {}),
        ...(parsed.data.cuisineType !== undefined ? { cuisineType: parsed.data.cuisineType } : {}),
        ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
        ...(parsed.data.coverImageUrl !== undefined ? { coverImageUrl: parsed.data.coverImageUrl } : {}),
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") return next(new ApiError(404, "Provider profile not found"));
    next(err);
  }
});

export default router;