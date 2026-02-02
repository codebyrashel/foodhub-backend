import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { ApiError } from "../middlewares/errorHandler";
import { createProviderProfileSchema } from "../validators/provider.validators";

const router = Router();

router.use(requireAuth);

/**
 * Provider onboarding:
 * POST /api/onboarding/provider
 *
 * - upgrades current user role to provider
 * - creates ProviderProfile (1:1)
 */

router.post("/provider", async (req: any, res, next) => {
  try {
    const parsed = createProviderProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());

    const userId = req.user.id;

    const existingProfile = await prisma.providerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existingProfile) {
      throw new ApiError(409, "Provider profile already exists");
    }

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: "provider" },
      });

      const profile = await tx.providerProfile.create({
        data: {
          userId,
          restaurantName: parsed.data.restaurantName,
          cuisineType: parsed.data.cuisineType,
          address: parsed.data.address,
          coverImageUrl: parsed.data.coverImageUrl ?? null,
        },
      });

      return profile;
    });

    res.status(201).json(result);
  } catch (err: any) {
    if (err?.code === "P2002") return next(new ApiError(409, "Provider profile already exists"));
    next(err);
  }
});

export default router;