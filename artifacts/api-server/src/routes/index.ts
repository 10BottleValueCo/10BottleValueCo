import { Router, type IRouter } from "express";
import accountEmailChangeRouter from "./account-email-change";
import accountEmailLoginRouter from "./account-email-login";
import affiliateAccountRouter from "./affiliate-account";
import healthRouter from "./health";
import meritCheckoutRouter from "./merit-checkout";
import orderCostsRouter from "./order-costs";

const router: IRouter = Router();

router.use(affiliateAccountRouter);
router.use(accountEmailChangeRouter);
router.use(accountEmailLoginRouter);
router.use(meritCheckoutRouter);
router.use(orderCostsRouter);
router.use(healthRouter);

export default router;
