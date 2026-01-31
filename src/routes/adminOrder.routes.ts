import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import { adminOrdersQuerySchema } from "../validators/admin.validators";

const router = Router();

router.use(requireAuth, requireRole(["admin"]));

/**
 * Admin: view all orders (optional filter by status)
 * GET /api/admin/orders
 */
router.get("/orders", async (req, res, next) => {
  try {
    const parsed = adminOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, "Invalid query", parsed.error.flatten());

    const orders = await prisma.order.findMany({
      where: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { meal: true } },
        customer: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true, providerProfile: true } },
      },
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

export default router;