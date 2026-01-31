import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ApiError } from "../middlewares/errorHandler";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "../validators/category.validators";

const router = Router();

router.use(requireAuth, requireRole(["admin"]));

/**
 * Admin: create category
 * POST /api/admin/categories
 */
router.post("/categories", async (req, res, next) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());

    const created = await prisma.category.create({
      data: {
        name: parsed.data.name,
        imageUrl: parsed.data.imageUrl ?? null,
      },
    });

    res.status(201).json(created);
  } catch (err: any) {
    // Unique constraint for category name
    if (err?.code === "P2002") {
      return next(new ApiError(409, "Category name already exists"));
    }
    next(err);
  }
});

/**
 * Admin: update category
 * PATCH /api/admin/categories/:id
 */
router.patch("/categories/:id", async (req, res, next) => {
  try {
    const params = categoryIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    const body = updateCategorySchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());

    const updated = await prisma.category.update({
      where: { id: params.data.id },
      data: {
        ...(body.data.name !== undefined ? { name: body.data.name } : {}),
        ...(body.data.imageUrl !== undefined ? { imageUrl: body.data.imageUrl } : {}),
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") return next(new ApiError(404, "Category not found"));
    if (err?.code === "P2002") return next(new ApiError(409, "Category name already exists"));
    next(err);
  }
});

/**
 * Admin: delete category
 * DELETE /api/admin/categories/:id
 */
router.delete("/categories/:id", async (req, res, next) => {
  try {
    const params = categoryIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());

    await prisma.category.delete({ where: { id: params.data.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === "P2025") return next(new ApiError(404, "Category not found"));
    next(err);
  }
});

export default router;