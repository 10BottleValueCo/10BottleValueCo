import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.all(
  "/account-email-change",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const handlerUrl = new URL("../../../api/account-email-change.js", import.meta.url);
      const module = (await import(handlerUrl.href)) as {
        default: (request: Request, response: Response) => Promise<unknown>;
      };
      await module.default(req, res);
    } catch {
      req.log.error({ requestId: req.id }, "Account email change adapter failed");
      if (res.headersSent) return;
      res.setHeader("Cache-Control", "private, no-store");
      res.status(503).json({ ok: false, error: "Email changes are temporarily unavailable." });
    }
  },
);

export default router;
