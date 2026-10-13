import { Router, type IRouter } from "express";

const router: IRouter = Router();
// The API server's dev and production commands both execute dist/index.mjs.
const handlerUrl = new URL("../../../api/admin-order-costs.js", import.meta.url).href;

router.all("/admin-order-costs", async (req, res, next) => {
  try {
    const { default: handler } = await import(handlerUrl);
    await handler(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
