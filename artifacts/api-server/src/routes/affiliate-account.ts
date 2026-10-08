import { Router, type IRouter, type Request, type Response } from "express";

type ResponseAdapter = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseAdapter;
  json(body: unknown): ResponseAdapter;
};

const router: IRouter = Router();

router.get(
  "/affiliate-account",
  async (req: Request, res: Response): Promise<void> => {
    let responseStatus = 200;
    let responseBody: unknown;
    const adapter: ResponseAdapter = {
      setHeader(name, value) {
        res.setHeader(name, value);
      },
      status(code) {
        responseStatus = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    try {
      const handlerUrl = new URL(
        "../../../api/affiliate-account.js",
        import.meta.url,
      );
      const module = (await import(handlerUrl.href)) as {
        default: (
          request: Request,
          response: ResponseAdapter,
        ) => Promise<unknown>;
      };
      await module.default(req, adapter);
      res.status(responseStatus).json(responseBody);
    } catch (error) {
      req.log.error({ err: error }, "Affiliate account handler failed");
      res.status(503).json({
        ok: false,
        error: "Affiliate account data is temporarily unavailable.",
      });
    }
  },
);

export default router;
