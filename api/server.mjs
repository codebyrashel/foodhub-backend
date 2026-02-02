// src/app.ts
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

// src/utils/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// src/lib/prisma.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma || new PrismaClient({
  log: ["query"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/utils/auth.ts
var auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  trustedOrigins: [process.env.FRONTEND_URL],
  //? Extending the User Model
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer"
      }
    }
  },
  //? Email and password config
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true
  }
});

// src/middlewares/errorHandler.ts
var ApiError = class extends Error {
  statusCode;
  details;
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
};
function errorHandler(err, req, res, next) {
  const fallback = {
    message: "Internal server error"
  };
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details
    });
  }
  if (err instanceof Error) {
    return res.status(500).json({
      message: process.env.NODE_ENV === "production" ? fallback.message : err.message
    });
  }
  return res.status(500).json(fallback);
}

// src/routes/category.routes.ts
import { Router } from "express";
var router = Router();
router.get("/", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" }
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});
var category_routes_default = router;

// src/routes/adminCategory.routes.ts
import { Router as Router2 } from "express";

// src/middlewares/requireAuth.ts
async function requireAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });
    if (!session?.user) {
      throw new ApiError(401, "Unauthorized");
    }
    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

// src/middlewares/requireRole.ts
function requireRole(roles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) throw new ApiError(401, "Unauthorized");
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true, status: true }
      });
      if (!dbUser) throw new ApiError(401, "Unauthorized");
      if (dbUser.status === "suspended") throw new ApiError(403, "Account suspended");
      if (!roles.includes(dbUser.role)) {
        throw new ApiError(403, "Forbidden");
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// src/validators/category.validators.ts
import { z } from "zod";
var createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  imageUrl: z.string().url("Invalid imageUrl").optional().nullable()
});
var updateCategorySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  imageUrl: z.string().url("Invalid imageUrl").optional().nullable()
});
var categoryIdParamSchema = z.object({
  id: z.string().uuid("Invalid category id")
});

// src/routes/adminCategory.routes.ts
var router2 = Router2();
router2.use(requireAuth, requireRole(["admin"]));
router2.post("/categories", async (req, res, next) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
    const created = await prisma.category.create({
      data: {
        name: parsed.data.name,
        imageUrl: parsed.data.imageUrl ?? null
      }
    });
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === "P2002") {
      return next(new ApiError(409, "Category name already exists"));
    }
    next(err);
  }
});
router2.patch("/categories/:id", async (req, res, next) => {
  try {
    const params = categoryIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());
    const body = updateCategorySchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());
    const updated = await prisma.category.update({
      where: { id: params.data.id },
      data: {
        ...body.data.name !== void 0 ? { name: body.data.name } : {},
        ...body.data.imageUrl !== void 0 ? { imageUrl: body.data.imageUrl } : {}
      }
    });
    res.json(updated);
  } catch (err) {
    if (err?.code === "P2025") return next(new ApiError(404, "Category not found"));
    if (err?.code === "P2002") return next(new ApiError(409, "Category name already exists"));
    next(err);
  }
});
router2.delete("/categories/:id", async (req, res, next) => {
  try {
    const params = categoryIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());
    await prisma.category.delete({ where: { id: params.data.id } });
    res.status(204).send();
  } catch (err) {
    if (err?.code === "P2025") return next(new ApiError(404, "Category not found"));
    next(err);
  }
});
var adminCategory_routes_default = router2;

// src/routes/meal.routes.ts
import { Router as Router3 } from "express";

// src/validators/meal.validators.ts
import { z as z2 } from "zod";
var mealIdParamSchema = z2.object({
  id: z2.string().uuid("Invalid meal id")
});
var mealQuerySchema = z2.object({
  categoryId: z2.string().uuid().optional(),
  providerId: z2.string().optional(),
  search: z2.string().min(1).optional(),
  minPrice: z2.coerce.number().nonnegative().optional(),
  maxPrice: z2.coerce.number().nonnegative().optional(),
  isAvailable: z2.coerce.boolean().optional()
});
var createMealSchema = z2.object({
  categoryId: z2.string().uuid("Invalid categoryId"),
  name: z2.string().min(2).max(80),
  description: z2.string().max(500).optional().nullable(),
  price: z2.coerce.number().positive("Price must be greater than 0"),
  imageUrl: z2.string().url().optional().nullable(),
  isAvailable: z2.boolean().optional()
});
var updateMealSchema = z2.object({
  categoryId: z2.string().uuid().optional(),
  name: z2.string().min(2).max(80).optional(),
  description: z2.string().max(500).optional().nullable(),
  price: z2.coerce.number().positive().optional(),
  imageUrl: z2.string().url().optional().nullable(),
  isAvailable: z2.boolean().optional()
});

// src/routes/meal.routes.ts
var router3 = Router3();
router3.get("/", async (req, res, next) => {
  try {
    const parsed = mealQuerySchema.safeParse(req.query);
    if (!parsed.success)
      throw new ApiError(400, "Invalid query", parsed.error.flatten());
    const { categoryId, providerId, search, minPrice, maxPrice, isAvailable } = parsed.data;
    const meals = await prisma.meal.findMany({
      where: {
        ...categoryId ? { categoryId } : {},
        ...providerId ? { providerId } : {},
        ...isAvailable !== void 0 ? { isAvailable } : {},
        ...search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } }
          ]
        } : {},
        ...minPrice !== void 0 || maxPrice !== void 0 ? {
          price: {
            ...minPrice !== void 0 ? { gte: minPrice } : {},
            ...maxPrice !== void 0 ? { lte: maxPrice } : {}
          }
        } : {},
        provider: { status: "active" }
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        provider: {
          select: { id: true, name: true, image: true, providerProfile: true }
        }
      }
    });
    res.json(meals);
  } catch (err) {
    next(err);
  }
});
router3.get("/:id", async (req, res, next) => {
  try {
    const params = mealIdParamSchema.safeParse(req.params);
    if (!params.success)
      throw new ApiError(400, "Invalid id", params.error.flatten());
    const meal = await prisma.meal.findFirst({
      where: { id: params.data.id, provider: { status: "active" } },
      include: {
        category: true,
        provider: {
          select: { id: true, name: true, image: true, providerProfile: true }
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { id: true, name: true, image: true } }
          }
        }
      }
    });
    if (!meal) throw new ApiError(404, "Meal not found");
    res.json(meal);
  } catch (err) {
    next(err);
  }
});
var meal_routes_default = router3;

// src/routes/provider.routes.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/", async (req, res, next) => {
  try {
    const providers = await prisma.user.findMany({
      where: { role: "provider", status: "active" },
      select: {
        id: true,
        name: true,
        image: true,
        providerProfile: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(providers);
  } catch (err) {
    next(err);
  }
});
router4.get("/:id", async (req, res, next) => {
  try {
    const providerId = req.params.id;
    const provider = await prisma.user.findFirst({
      where: { id: providerId, role: "provider", status: "active" },
      select: {
        id: true,
        name: true,
        image: true,
        providerProfile: true,
        meals: {
          where: { isAvailable: true },
          orderBy: { createdAt: "desc" },
          include: { category: true }
        }
      }
    });
    if (!provider) throw new ApiError(404, "Provider not found");
    res.json(provider);
  } catch (err) {
    next(err);
  }
});
var provider_routes_default = router4;

// src/routes/providerMeal.routes.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.use(requireAuth, requireRole(["provider"]));
router5.post("/meals", async (req, res, next) => {
  try {
    const parsed = createMealSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true }
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
        isAvailable: parsed.data.isAvailable ?? true
      }
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});
router5.put("/meals/:id", async (req, res, next) => {
  try {
    const params = mealIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());
    const body = updateMealSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());
    const existing = await prisma.meal.findUnique({
      where: { id: params.data.id },
      select: { id: true, providerId: true }
    });
    if (!existing) throw new ApiError(404, "Meal not found");
    if (existing.providerId !== req.user.id) throw new ApiError(403, "Forbidden");
    if (body.data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: body.data.categoryId },
        select: { id: true }
      });
      if (!category) throw new ApiError(404, "Category not found");
    }
    const updated = await prisma.meal.update({
      where: { id: params.data.id },
      data: {
        ...body.data.categoryId !== void 0 ? { categoryId: body.data.categoryId } : {},
        ...body.data.name !== void 0 ? { name: body.data.name } : {},
        ...body.data.description !== void 0 ? { description: body.data.description } : {},
        ...body.data.price !== void 0 ? { price: body.data.price } : {},
        ...body.data.imageUrl !== void 0 ? { imageUrl: body.data.imageUrl } : {},
        ...body.data.isAvailable !== void 0 ? { isAvailable: body.data.isAvailable } : {}
      }
    });
    res.json(updated);
  } catch (err) {
    if (err?.code === "P2025") return next(new ApiError(404, "Meal not found"));
    next(err);
  }
});
router5.delete("/meals/:id", async (req, res, next) => {
  try {
    const params = mealIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());
    const existing = await prisma.meal.findUnique({
      where: { id: params.data.id },
      select: { id: true, providerId: true }
    });
    if (!existing) throw new ApiError(404, "Meal not found");
    if (existing.providerId !== req.user.id) throw new ApiError(403, "Forbidden");
    await prisma.meal.delete({ where: { id: params.data.id } });
    res.status(204).send();
  } catch (err) {
    if (err?.code === "P2025") return next(new ApiError(404, "Meal not found"));
    next(err);
  }
});
var providerMeal_routes_default = router5;

// src/routes/order.routes.ts
import { Router as Router6 } from "express";

// src/validators/order.validators.ts
import { z as z3 } from "zod";
var orderIdParamSchema = z3.object({
  id: z3.string().uuid("Invalid order id")
});
var createOrderSchema = z3.object({
  deliveryAddress: z3.string().min(10, "Delivery address is too short").max(300),
  items: z3.array(
    z3.object({
      mealId: z3.string().uuid("Invalid mealId"),
      quantity: z3.coerce.number().int().min(1).max(20)
    })
  ).min(1, "Order must contain at least one item")
});
var providerUpdateOrderStatusSchema = z3.object({
  status: z3.enum(["preparing", "ready", "delivered"])
});

// src/routes/order.routes.ts
var router6 = Router6();
router6.use(requireAuth, requireRole(["customer"]));
router6.post("/", async (req, res, next) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
    const { deliveryAddress, items } = parsed.data;
    const mealIds = items.map((i) => i.mealId);
    const meals = await prisma.meal.findMany({
      where: {
        id: { in: mealIds },
        isAvailable: true,
        provider: { status: "active" }
      },
      select: {
        id: true,
        price: true,
        providerId: true
      }
    });
    if (meals.length !== mealIds.length) {
      throw new ApiError(400, "Some meals are unavailable or do not exist");
    }
    const providerIds = new Set(meals.map((m) => m.providerId));
    if (providerIds.size !== 1) {
      throw new ApiError(400, "All items in an order must be from the same provider");
    }
    const providerId = Array.from(providerIds)[0];
    const qtyMap = new Map(items.map((i) => [i.mealId, i.quantity]));
    const totalAmount = meals.reduce((sum, m) => {
      const qty = qtyMap.get(m.id) || 0;
      return sum + Number(m.price) * qty;
    }, 0);
    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: req.user.id,
          providerId,
          deliveryAddress,
          totalAmount,
          status: "placed",
          items: {
            create: meals.map((m) => ({
              mealId: m.id,
              quantity: qtyMap.get(m.id),
              priceAtTime: m.price
              // snapshot
            }))
          }
        },
        include: {
          items: { include: { meal: true } }
        }
      });
      return order;
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});
router6.get("/", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { meal: true } },
        provider: { select: { id: true, name: true, image: true, providerProfile: true } }
      }
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});
router6.get("/:id", async (req, res, next) => {
  try {
    const params = orderIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());
    const order = await prisma.order.findFirst({
      where: { id: params.data.id, customerId: req.user.id },
      include: {
        items: { include: { meal: { include: { category: true } } } },
        provider: { select: { id: true, name: true, image: true, providerProfile: true } }
      }
    });
    if (!order) throw new ApiError(404, "Order not found");
    res.json(order);
  } catch (err) {
    next(err);
  }
});
router6.patch("/:id/cancel", async (req, res, next) => {
  try {
    const params = orderIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());
    const existing = await prisma.order.findFirst({
      where: { id: params.data.id, customerId: req.user.id },
      select: { id: true, status: true }
    });
    if (!existing) throw new ApiError(404, "Order not found");
    if (existing.status !== "placed") {
      throw new ApiError(400, "Only placed orders can be cancelled");
    }
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { status: "cancelled" }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
var order_routes_default = router6;

// src/routes/providerOrder.routes.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.use(requireAuth, requireRole(["provider"]));
router7.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { providerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { meal: true } },
        customer: { select: { id: true, name: true, email: true, image: true } }
      }
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});
function isValidTransition(current, next) {
  const allowed = {
    placed: ["preparing", "cancelled"],
    preparing: ["ready"],
    ready: ["delivered"],
    delivered: [],
    cancelled: []
  };
  return (allowed[current] || []).includes(next);
}
router7.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const params = orderIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid id", params.error.flatten());
    const body = providerUpdateOrderStatusSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());
    const existing = await prisma.order.findFirst({
      where: { id: params.data.id, providerId: req.user.id },
      select: { id: true, status: true }
    });
    if (!existing) throw new ApiError(404, "Order not found");
    if (!isValidTransition(existing.status, body.data.status)) {
      throw new ApiError(400, `Invalid status transition from ${existing.status} to ${body.data.status}`);
    }
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { status: body.data.status },
      include: {
        items: { include: { meal: true } },
        customer: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
var providerOrder_routes_default = router7;

// src/routes/review.routes.ts
import { Router as Router8 } from "express";

// src/validators/review.validators.ts
import { z as z4 } from "zod";
var createReviewSchema = z4.object({
  mealId: z4.string().uuid("Invalid mealId"),
  rating: z4.coerce.number().int().min(1).max(5),
  comment: z4.string().max(500).optional().nullable()
});

// src/routes/review.routes.ts
var router8 = Router8();
router8.use(requireAuth, requireRole(["customer"]));
router8.post("/", async (req, res, next) => {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
    const { mealId, rating, comment } = parsed.data;
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      select: { id: true }
    });
    if (!meal) throw new ApiError(404, "Meal not found");
    const hasDeliveredPurchase = await prisma.orderItem.findFirst({
      where: {
        mealId,
        order: {
          customerId: req.user.id,
          status: "delivered"
        }
      },
      select: { id: true }
    });
    if (!hasDeliveredPurchase) {
      throw new ApiError(403, "You can review only after a delivered order");
    }
    const created = await prisma.review.create({
      data: {
        customerId: req.user.id,
        mealId,
        rating,
        comment: comment ?? null
      }
    });
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === "P2002") {
      return next(new ApiError(409, "You already reviewed this meal"));
    }
    next(err);
  }
});
var review_routes_default = router8;

// src/routes/onboarding.routes.ts
import { Router as Router9 } from "express";

// src/validators/provider.validators.ts
import { z as z5 } from "zod";
var createProviderProfileSchema = z5.object({
  restaurantName: z5.string().min(2).max(80),
  cuisineType: z5.string().min(2).max(50),
  address: z5.string().min(10).max(200),
  coverImageUrl: z5.string().url().optional().nullable()
});

// src/routes/onboarding.routes.ts
var router9 = Router9();
router9.use(requireAuth);
router9.post("/provider", async (req, res, next) => {
  try {
    const parsed = createProviderProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
    const userId = req.user.id;
    const existingProfile = await prisma.providerProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (existingProfile) {
      throw new ApiError(409, "Provider profile already exists");
    }
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: "provider" }
      });
      const profile = await tx.providerProfile.create({
        data: {
          userId,
          restaurantName: parsed.data.restaurantName,
          cuisineType: parsed.data.cuisineType,
          address: parsed.data.address,
          coverImageUrl: parsed.data.coverImageUrl ?? null
        }
      });
      return profile;
    });
    res.status(201).json(result);
  } catch (err) {
    if (err?.code === "P2002") return next(new ApiError(409, "Provider profile already exists"));
    next(err);
  }
});
var onboarding_routes_default = router9;

// src/routes/adminUser.routes.ts
import { Router as Router10 } from "express";

// src/validators/admin.validators.ts
import { z as z6 } from "zod";
var adminUserIdParamSchema = z6.object({
  id: z6.string().min(10, "Invalid user id")
});
var updateUserStatusSchema = z6.object({
  status: z6.enum(["active", "suspended"])
});
var adminOrdersQuerySchema = z6.object({
  status: z6.enum(["placed", "preparing", "ready", "delivered", "cancelled"]).optional()
});

// src/routes/adminUser.routes.ts
var router10 = Router10();
router10.use(requireAuth, requireRole(["admin"]));
router10.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        providerProfile: true
      }
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});
router10.patch("/users/:id", async (req, res, next) => {
  try {
    const params = adminUserIdParamSchema.safeParse(req.params);
    if (!params.success) throw new ApiError(400, "Invalid user id", params.error.flatten());
    const body = updateUserStatusSchema.safeParse(req.body);
    if (!body.success) throw new ApiError(400, "Validation failed", body.error.flatten());
    const currentUserId = req.user?.id;
    if (currentUserId && currentUserId === params.data.id) {
      throw new ApiError(400, "You cannot change your own status");
    }
    const updated = await prisma.user.update({
      where: { id: params.data.id },
      data: { status: body.data.status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true
      }
    });
    res.json(updated);
  } catch (err) {
    if (err?.code === "P2025") return next(new ApiError(404, "User not found"));
    next(err);
  }
});
var adminUser_routes_default = router10;

// src/routes/adminOrder.routes.ts
import { Router as Router11 } from "express";
var router11 = Router11();
router11.use(requireAuth, requireRole(["admin"]));
router11.get("/orders", async (req, res, next) => {
  try {
    const parsed = adminOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, "Invalid query", parsed.error.flatten());
    const orders = await prisma.order.findMany({
      where: {
        ...parsed.data.status ? { status: parsed.data.status } : {}
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { meal: true } },
        customer: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true, providerProfile: true } }
      }
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});
var adminOrder_routes_default = router11;

// src/routes/me.routes.ts
import { Router as Router12 } from "express";

// src/validators/profile.validators.ts
import { z as z7 } from "zod";
var updateMeSchema = z7.object({
  name: z7.string().min(2).max(80).optional(),
  image: z7.string().url("Invalid image url").optional().nullable()
});
var updateProviderProfileSchema = z7.object({
  restaurantName: z7.string().min(2).max(80).optional(),
  cuisineType: z7.string().min(2).max(50).optional(),
  address: z7.string().min(10).max(200).optional(),
  coverImageUrl: z7.string().url().optional().nullable()
});

// src/routes/me.routes.ts
var router12 = Router12();
router12.use(requireAuth);
router12.get("/", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        providerProfile: true
      }
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  } catch (err) {
    next(err);
  }
});
router12.patch("/", async (req, res, next) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...parsed.data.name !== void 0 ? { name: parsed.data.name } : {},
        ...parsed.data.image !== void 0 ? { image: parsed.data.image } : {}
      },
      select: { id: true, name: true, email: true, image: true, role: true }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
var me_routes_default = router12;

// src/routes/providerMeProfile.routes.ts
import { Router as Router13 } from "express";
var router13 = Router13();
router13.use(requireAuth, requireRole(["provider"]));
router13.get("/me/profile", async (req, res, next) => {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!profile) throw new ApiError(404, "Provider profile not found");
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
router13.patch("/me/profile", async (req, res, next) => {
  try {
    const parsed = updateProviderProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten());
    const updated = await prisma.providerProfile.update({
      where: { userId: req.user.id },
      data: {
        ...parsed.data.restaurantName !== void 0 ? { restaurantName: parsed.data.restaurantName } : {},
        ...parsed.data.cuisineType !== void 0 ? { cuisineType: parsed.data.cuisineType } : {},
        ...parsed.data.address !== void 0 ? { address: parsed.data.address } : {},
        ...parsed.data.coverImageUrl !== void 0 ? { coverImageUrl: parsed.data.coverImageUrl } : {}
      }
    });
    res.json(updated);
  } catch (err) {
    if (err?.code === "P2025") return next(new ApiError(404, "Provider profile not found"));
    next(err);
  }
});
var providerMeProfile_routes_default = router13;

// src/app.ts
var app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      message: "FoodHub API is running",
      db: "connected"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      message: "Database connection failed"
    });
  }
});
app.get("/", (req, res) => {
  res.send("Hello from FoodHub backend");
});
app.use("/api/categories", category_routes_default);
app.use("/api/admin", adminCategory_routes_default);
app.use("/api/admin", adminUser_routes_default);
app.use("/api/admin", adminOrder_routes_default);
app.use("/api/meals", meal_routes_default);
app.use("/api/providers", provider_routes_default);
app.use("/api/provider", providerMeal_routes_default);
app.use("/api/provider", providerOrder_routes_default);
app.use("/api/provider", providerMeProfile_routes_default);
app.use("/api/orders", order_routes_default);
app.use("/api/reviews", review_routes_default);
app.use("/api/onboarding", onboarding_routes_default);
app.use("/api/me", me_routes_default);
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
app.use(errorHandler);
var app_default = app;

// src/config/env.ts
import "dotenv/config";
import { z as z8 } from "zod";
var envSchema = z8.object({
  PORT: z8.coerce.number().default(3e3),
  DATABASE_URL: z8.string().min(1),
  FRONTEND_URL: z8.string().min(1),
  ADMIN_EMAIL: z8.string().email().optional(),
  ADMIN_PASSWORD: z8.string().min(6).optional(),
  NODE_ENV: z8.enum(["development", "test", "production"]).optional()
});
var env = envSchema.parse(process.env);

// src/server.ts
var PORT = env.PORT;
async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to the database");
    app_default.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("An error occurred: ", error);
    process.exit(1);
  }
}
main();
