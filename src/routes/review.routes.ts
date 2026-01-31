import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import { createReviewSchema } from "../validators/review.validators";

const router = Router();

router.use(requireAuth, requireRole(["customer"]));

/**
 * Customer: create review
 * POST /api/reviews
 *
 * Rules:
 * - customer must have an order containing the meal
 * - order must be delivered
 * - prevent duplicate review per meal per customer
 */
router.post("/", async (req: any, res, next) => {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());

    const { mealId, rating, comment } = parsed.data;

    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      select: { id: true },
    });
    if (!meal) throw new ApiError(404, "Meal not found");

    const hasDeliveredPurchase = await prisma.orderItem.findFirst({
      where: {
        mealId,
        order: {
          customerId: req.user.id,
          status: "delivered",
        },
      },
      select: { id: true },
    });

    if (!hasDeliveredPurchase) {
      throw new ApiError(403, "You can review only after a delivered order");
    }

    const created = await prisma.review.create({
      data: {
        customerId: req.user.id,
        mealId,
        rating,
        comment: comment ?? null,
      },
    });

    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return next(new ApiError(409, "You already reviewed this meal"));
    }
    next(err);
  }
});

export default router;