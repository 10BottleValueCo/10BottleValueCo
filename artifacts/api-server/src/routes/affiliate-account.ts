import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.all(
  "/affiliate-account",
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Resolved from dist/index.mjs so Preview and the deployed handler share
      // the same ownership checks and response sanitization.
      const handlerUrl = new URL("../../../api/affiliate-account.js", import.meta.url);
      const module = (await import(handlerUrl.href)) as {
        default: (request: Request, response: Response) => Promise<unknown>;
      };
      await module.default(req, res);
    } catch {
      req.log.error({ requestId: req.id }, "Affiliate account adapter failed");
      if (res.headersSent) return;
      res.setHeader("Cache-Control", "private, no-store");
      res.status(503).json({ ok: false, error: "Affiliate account is unavailable." });
    }
  },
);

export default router;
