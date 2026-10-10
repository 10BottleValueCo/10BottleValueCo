import { Router, type IRouter } from "express";
import affiliateAccountRouter from "./affiliate-account";
import healthRouter from "./health";
import storeCreditCheckoutRouter from "./store-credit-checkout";
import trackingEmailRouter from "./tracking-email";
import supportAttachmentsRouter from "./support-attachments";
import orderCheckoutRouter from "./order-checkout";
import publicPromoCodeRouter from "./public-promo-code";
import meritCheckoutRouter from "./merit-checkout";

const router: IRouter = Router();

router.use(healthRouter);
router.use(affiliateAccountRouter);
router.use(storeCreditCheckoutRouter);
router.use(trackingEmailRouter);
router.use(supportAttachmentsRouter);
router.use(orderCheckoutRouter);
router.use(publicPromoCodeRouter);
router.use(meritCheckoutRouter);

export default router;
