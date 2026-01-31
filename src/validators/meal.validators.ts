import { z } from "zod";

export const mealIdParamSchema = z.object({
  id: z.string().uuid("Invalid meal id"),
});

export const mealQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  providerId: z.string().optional(),
  search: z.string().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  isAvailable: z.coerce.boolean().optional(),
});

export const createMealSchema = z.object({
  categoryId: z.string().uuid("Invalid categoryId"),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageUrl: z.string().url().optional().nullable(),
  isAvailable: z.boolean().optional(),
});

export const updateMealSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  price: z.coerce.number().positive().optional(),
  imageUrl: z.string().url().optional().nullable(),
  isAvailable: z.boolean().optional(),
});