import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  imageUrl: z.string().url("Invalid imageUrl").optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  imageUrl: z.string().url("Invalid imageUrl").optional().nullable(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().uuid("Invalid category id"),
});