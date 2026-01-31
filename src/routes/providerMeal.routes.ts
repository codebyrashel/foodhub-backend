import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import {
  createMealSchema,
  mealIdParamSchema,
  updateMealSchema,
} from "../validators/meal.validators";

const router = Router();

router.use(requireAuth, requireRole(["provider"]));

/**
 * Provider: create meal
 * POST /api/provider/meals
 */
router.post("/meals", async (req: any, res, next) => {
  try {
    const parsed = createMealSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });
    if (!category) throw new ApiError(404, "Category not found");

    const created = await prisma.meal.create({
      data: {
        providerId: req.user.id,
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        imageUrl: parsed.data.imageUrl ?? null,
        isAvailable: parsed.data.isAvailable ?? true,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/**
 * Provider: update own meal
 * PUT /api/provider/meals/:id
 */
router.put("/meals/:id", async (req: any, res, next) => {
  try {
    const params = mealIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    const body = updateMealSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());

    const existing = await prisma.meal.findUnique({
      where: { id: params.data.id },
      select: { id: true, providerId: true },
    });
    if (!existing) throw new ApiError(404, "Meal not found");
    if (existing.providerId !== req.user.id) throw new ApiError(403, "Forbidden");

    if (body.data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: body.data.categoryId },
        select: { id: true },
      });
      if (!category) throw new ApiError(404, "Category not found");
    }

    const updated = await prisma.meal.update({
      where: { id: params.data.id },
      data: {
        ...(body.data.categoryId !== undefined ? { categoryId: body.data.categoryId } : {}),
        ...(body.data.name !== undefined ? { name: body.data.name } : {}),
        ...(body.data.description !== undefined ? { description: body.data.description } : {}),
        ...(body.data.price !== undefined ? { price: body.data.price } : {}),
        ...(body.data.imageUrl !== undefined ? { imageUrl: body.data.imageUrl } : {}),
        ...(body.data.isAvailable !== undefined ? { isAvailable: body.data.isAvailable } : {}),
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") return next(new ApiError(404, "Meal not found"));
    next(err);
  }
});

/**
 * Provider: delete own meal
 * DELETE /api/provider/meals/:id
 */
router.delete("/meals/:id", async (req: any, res, next) => {
  try {
    const params = mealIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    const existing = await prisma.meal.findUnique({
      where: { id: params.data.id },
      select: { id: true, providerId: true },
    });
    if (!existing) throw new ApiError(404, "Meal not found");
    if (existing.providerId !== req.user.id) throw new ApiError(403, "Forbidden");

    await prisma.meal.delete({ where: { id: params.data.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === "P2025") return next(new ApiError(404, "Meal not found"));
    next(err);
  }
});

export default router;