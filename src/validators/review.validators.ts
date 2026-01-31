import { z } from "zod";

export const createReviewSchema = z.object({
  mealId: z.string().uuid("Invalid mealId"),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
});