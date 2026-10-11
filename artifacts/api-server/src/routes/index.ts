import { Router, type IRouter } from "express";
import accountEmailChangeRouter from "./account-email-change";
import affiliateAccountRouter from "./affiliate-account";
import healthRouter from "./health";
import meritCheckoutRouter from "./merit-checkout";

const router: IRouter = Router();

router.use(affiliateAccountRouter);
router.use(accountEmailChangeRouter);
router.use(meritCheckoutRouter);
router.use(healthRouter);

export default router;
