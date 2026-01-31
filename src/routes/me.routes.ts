import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { ApiError } from "../middlewares/errorHandler";
import { updateMeSchema } from "../validators/profile.validators";

const router = Router();

router.use(requireAuth);

/**
 * Me: current user info
 * GET /api/me
 */
router.get("/", async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        providerProfile: true,
      },
    });

    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * Me: update basic profile
 * PATCH /api/me
 */
router.patch("/", async (req: any, res, next) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.image !== undefined ? { image: parsed.data.image } : {}),
      },
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;