import express, { type Express } from "express";
import type { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// The storefront calls this API through the same-origin /api proxy. Do not
// grant arbitrary sites browser access to customer-facing API responses.
app.use(express.json({ limit: "64kb" }));
app.use(
  express.urlencoded({
    extended: false,
    limit: "32kb",
    parameterLimit: 100,
  }),
);

app.use("/api", router);

app.use(
  (
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const requestError =
      typeof error === "object" && error !== null
        ? (error as { type?: unknown })
        : {};
    if (requestError.type === "entity.too.large") {
      res.status(413).json({
        ok: false,
        error: "Request body is too large.",
      });
      return;
    }
    if (requestError.type === "entity.parse.failed") {
      res.status(400).json({
        ok: false,
        error: "Request body must contain valid JSON.",
      });
      return;
    }

    req.log.error({ requestId: req.id }, "Unhandled API request error");
    res.status(500).json({
      ok: false,
      error: "The request could not be processed.",
    });
  },
);

export default app;
