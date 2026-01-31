import { z } from "zod";

export const createProviderProfileSchema = z.object({
  restaurantName: z.string().min(2).max(80),
  cuisineType: z.string().min(2).max(50),
  address: z.string().min(10).max(200),
  coverImageUrl: z.string().url().optional().nullable(),
});