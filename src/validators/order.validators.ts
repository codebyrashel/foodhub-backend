import { z } from "zod";

export const orderIdParamSchema = z.object({
  id: z.string().uuid("Invalid order id"),
});

export const createOrderSchema = z.object({
  deliveryAddress: z.string().min(10, "Delivery address is too short").max(300),
  items: z
    .array(
      z.object({
        mealId: z.string().uuid("Invalid mealId"),
        quantity: z.coerce.number().int().min(1).max(20),
      }),
    )
    .min(1, "Order must contain at least one item"),
});

export const providerUpdateOrderStatusSchema = z.object({
  status: z.enum(["preparing", "ready", "delivered"]),
});