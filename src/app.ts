import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { registerRoutes } from "./routes";

export const app = express();

const corsOrigin =
  env.CORS_ORIGIN === "*"
    ? true
    : env.CORS_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.join(process.cwd(), env.LOCAL_UPLOAD_DIR)));

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Backend API is healthy." });
});

registerRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);
