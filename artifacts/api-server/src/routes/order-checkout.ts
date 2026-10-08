import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.all(
  "/order-checkout",
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Share the same implementation with the Vercel serverless endpoint.
      const handlerUrl = new URL("../../../api/order-checkout.js", import.meta.url);
      const module = (await import(handlerUrl.href)) as {
        default: (
          request: Request,
          response: Response,
        ) => Promise<unknown>;
      };
      await module.default(req, res);
    } catch (error) {
      req.log.error({ err: error }, "Checkout order route failed");
      res
        .status(503)
        .json({ ok: false, error: "Checkout order storage is unavailable." });
    }
  },
);

export default router;
