import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import { orderIdParamSchema, providerUpdateOrderStatusSchema } from "../validators/order.validators";

const router = Router();

router.use(requireAuth, requireRole(["provider"]));

/**
 * Provider: list incoming orders
 * GET /api/provider/orders
 */
router.get("/orders", async (req: any, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { providerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { meal: true } },
        customer: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

function isValidTransition(current: string, next: string) {
  const allowed: Record<string, string[]> = {
    placed: ["preparing", "cancelled"],
    preparing: ["ready"],
    ready: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  return (allowed[current] || []).includes(next);
}

/**
 * Provider: update order status
 * PATCH /api/provider/orders/:id/status
 */
router.patch("/orders/:id/status", async (req: any, res, next) => {
  try {
    const params = orderIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    const body = providerUpdateOrderStatusSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());

    const existing = await prisma.order.findFirst({
      where: { id: params.data.id, providerId: req.user.id },
      select: { id: true, status: true },
    });
    if (!existing) throw new ApiError(404, "Order not found");

    if (!isValidTransition(existing.status, body.data.status)) {
      throw new ApiError(400, `Invalid status transition from ${existing.status} to ${body.data.status}`);
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { status: body.data.status },
      include: {
        items: { include: { meal: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;