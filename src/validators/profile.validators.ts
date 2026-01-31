import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  image: z.string().url("Invalid image url").optional().nullable(),
});

export const updateProviderProfileSchema = z.object({
  restaurantName: z.string().min(2).max(80).optional(),
  cuisineType: z.string().min(2).max(50).optional(),
  address: z.string().min(10).max(200).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
});