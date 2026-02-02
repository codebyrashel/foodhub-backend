import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import { createOrderSchema, orderIdParamSchema } from "../validators/order.validators";

const router = Router();

router.use(requireAuth, requireRole(["customer"]));

/**
 * Customer: create order (single provider per order)
 * POST /api/orders
 */
router.post("/", async (req: any, res, next) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());

    const { deliveryAddress, items } = parsed.data;

    const mealIds = items.map((i) => i.mealId);
    const meals: any[] = await prisma.meal.findMany({
      where: {
        id: { in: mealIds },
        isAvailable: true,
        provider: { status: "active" },
      },
      select: {
        id: true,
        price: true,
        providerId: true,
      },
    });

    if (meals.length !== mealIds.length) {
      throw new ApiError(400, "Some meals are unavailable or do not exist");
    }

    const providerIds = new Set(meals.map((m: any) => m.providerId));
    if (providerIds.size !== 1) {
      throw new ApiError(400, "All items in an order must be from the same provider");
    }
    const providerId = Array.from(providerIds)[0];

    const qtyMap = new Map(items.map((i) => [i.mealId, i.quantity]));
    const totalAmount = meals.reduce((sum: number, m: any) => {
      const qty = qtyMap.get(m.id) || 0;
      return sum + Number(m.price) * qty;
    }, 0);

    const created = await prisma.$transaction(async (tx: any) => {
      const order = await tx.order.create({
        data: {
          customerId: req.user.id,
          providerId,
          deliveryAddress,
          totalAmount,
          status: "placed",
          items: {
            create: meals.map((m: any) => ({
              mealId: m.id,
              quantity: qtyMap.get(m.id)!,
              priceAtTime: m.price, // snapshot
            })),
          },
        },
        include: {
          items: { include: { meal: true } },
        },
      });

      return order;
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/**
 * Customer: list my orders
 * GET /api/orders
 */
router.get("/", async (req: any, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { meal: true } },
        provider: { select: { id: true, name: true, image: true, providerProfile: true } },
      },
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

/**
 * Customer: order details (only own)
 * GET /api/orders/:id
 */
router.get("/:id", async (req: any, res, next) => {
  try {
    const params = orderIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    const order = await prisma.order.findFirst({
      where: { id: params.data.id, customerId: req.user.id },
      include: {
        items: { include: { meal: { include: { category: true } } } },
        provider: { select: { id: true, name: true, image: true, providerProfile: true } },
      },
    });

    if (!order) throw new ApiError(404, "Order not found");
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * Customer: cancel order (only when placed)
 * PATCH /api/orders/:id/cancel
 */
router.patch("/:id/cancel", async (req: any, res, next) => {
  try {
    const params = orderIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    const existing = await prisma.order.findFirst({
      where: { id: params.data.id, customerId: req.user.id },
      select: { id: true, status: true },
    });
    if (!existing) throw new ApiError(404, "Order not found");

    if (existing.status !== "placed") {
      throw new ApiError(400, "Only placed orders can be cancelled");
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { status: "cancelled" },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;