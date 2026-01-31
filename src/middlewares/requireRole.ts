import type { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "./errorHandler";
import type { AuthedRequest } from "./requireAuth";

export function requireRole(roles: Array<"customer" | "provider" | "admin">) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) throw new ApiError(401, "Unauthorized");

      // Always check DB for status/role
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true, status: true },
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