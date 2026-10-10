import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.all(
  "/merit-checkout",
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Resolved from dist/index.mjs: share Vercel's payment implementation.
      const handlerUrl = new URL("../../../api/merit-checkout.js", import.meta.url);
      const module = (await import(handlerUrl.href)) as {
        default: (request: Request, response: Response) => Promise<unknown>;
      };
      await module.default(req, res);
    } catch {
      // Exceptions may contain credentials or customer/provider data.
      req.log.error({ requestId: req.id }, "Card checkout adapter failed");
      if (res.headersSent) return;
      res.setHeader("Cache-Control", "private, no-store");
      res.status(503).json({ ok: false, error: "Card checkout is unavailable." });
    }
  },
);

export default router;
