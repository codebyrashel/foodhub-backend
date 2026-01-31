import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const fallback = {
    message: "Internal server error",
  };

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof Error) {
    return res.status(500).json({
      message: process.env.NODE_ENV === "production" ? fallback.message : err.message,
    });
  }

  return res.status(500).json(fallback);
}