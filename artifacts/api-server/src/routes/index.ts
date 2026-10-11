import { Router, type IRouter } from "express";
import affiliateAccountRouter from "./affiliate-account";
import healthRouter from "./health";
import meritCheckoutRouter from "./merit-checkout";

const router: IRouter = Router();

router.use(affiliateAccountRouter);
router.use(meritCheckoutRouter);
router.use(healthRouter);

export default router;
