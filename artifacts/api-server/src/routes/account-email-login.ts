import { Router, type IRouter, type Request, type Response } from "express";
const router: IRouter = Router();
router.all("/account-email-login", async (req: Request, res: Response): Promise<void> => {
  try {
    const handlerUrl = new URL("../../../api/account-email-login.js", import.meta.url);
    const module = (await import(handlerUrl.href)) as {
      default: (request: Request, response: Response) => Promise<unknown>;
    };
    await module.default(req, res);
  } catch {
    if (!res.headersSent) res.status(503).json({ ok: false, error: "Email verification is temporarily unavailable." });
  }
});
export default router;
