import type { NextFunction, Request, Response } from "express";
import { auth } from "../utils/auth";
import { ApiError } from "./errorHandler";

export type AuthedRequest = Request & {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    // Better Auth server-side session fetch
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session?.user) {
      throw new ApiError(401, "Unauthorized");
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: (session.user as any).role,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}