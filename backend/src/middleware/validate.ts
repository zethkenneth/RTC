import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";
import { HttpError } from "../lib/errors.js";

export const IdParam = z.object({ id: z.coerce.number().int().positive() });

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, "Validation failed", z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}

export const notFoundRoute: RequestHandler = (req, _res, next) =>
  next(new HttpError(404, `Route ${req.method} ${req.path} not found`));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  // Malformed JSON body from express.json()
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
