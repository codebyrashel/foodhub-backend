import { z } from "zod";

export const adminUserIdParamSchema = z.object({
  id: z.string().min(10, "Invalid user id"),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

export const adminOrdersQuerySchema = z.object({
  status: z.enum(["placed", "preparing", "ready", "delivered", "cancelled"]).optional(),
});