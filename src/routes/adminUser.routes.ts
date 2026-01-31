import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import { adminUserIdParamSchema, updateUserStatusSchema } from "../validators/admin.validators";

const router = Router();

router.use(requireAuth, requireRole(["admin"]));

/**
 * Admin: list all users
 * GET /api/admin/users
 */
router.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        providerProfile: true,
      },
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
});

/**
 * Admin: update user status (suspend/activate)
 * PATCH /api/admin/users/:id
 */
router.patch("/users/:id", async (req, res, next) => {
  try {
    const params = adminUserIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid user id", params.error.flatten());

    const body = updateUserStatusSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());

    // Prevent admin from suspending themselves
    const currentUserId = (req as any).user?.id;

    if (currentUserId && currentUserId === params.data.id) {
      throw new ApiError(400, "You cannot change your own status");
    }

    const updated = await prisma.user.update({
      where: { id: params.data.id },
      data: { status: body.data.status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") return next(new ApiError(404, "User not found"));
    next(err);
  }
});

export default router;