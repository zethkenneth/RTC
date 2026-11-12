import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { api } from "./routes/index.js";
import { auth } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundRoute } from "./middleware/validate.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()), credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Public: login, logout, forgot/reset password.
app.use("/api/auth", auth);
// Everything else under /api needs a signed-in user.
app.use("/api", requireAuth, api);

app.use(notFoundRoute);
app.use(errorHandler);
