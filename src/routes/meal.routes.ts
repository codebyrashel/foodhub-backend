import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../middlewares/errorHandler";
import { mealIdParamSchema, mealQuerySchema } from "../validators/meal.validators";

const router = Router();

/**
 * Public: list meals with filters
 * GET /api/meals
 */
router.get("/", async (req, res, next) => {
  try {
    const parsed = mealQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, "Invalid query", parsed.error.flatten());

    const { categoryId, providerId, search, minPrice, maxPrice, isAvailable } = parsed.data;

    const meals = await prisma.meal.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(providerId ? { providerId } : {}),
        ...(isAvailable !== undefined ? { isAvailable } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? {
              price: {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
              },
            }
          : {}),
        provider: { status: "active" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        provider: {
          select: { id: true, name: true, image: true, providerProfile: true },
        },
      },
    });

    res.json(meals);
  } catch (err) {
    next(err);
  }
});

/**
 * Public: meal details
 * GET /api/meals/:id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const params = mealIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    const meal = await prisma.meal.findFirst({
      where: { id: params.data.id, provider: { status: "active" } },
      include: {
        category: true,
        provider: { select: { id: true, name: true, image: true, providerProfile: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { customer: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    if (!meal) throw new ApiError(404, "Meal not found");
    res.json(meal);
  } catch (err) {
    next(err);
  }
});

export default router;