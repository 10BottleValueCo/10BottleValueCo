import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.all(
  "/merit-checkout",
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Reuse the same payment handler as the production serverless endpoint.
      const handlerUrl = new URL("../../../api/merit-checkout.js", import.meta.url);
      const module = (await import(handlerUrl.href)) as {
        default: (
          request: Request,
          response: Response,
        ) => Promise<unknown>;
      };
      await module.default(req, res);
    } catch (error) {
      req.log.error({ err: error }, "Merit checkout route failed");
      res.status(503).json({ ok: false, error: "Secure checkout is temporarily unavailable." });
    }
  },
);

export default router;
