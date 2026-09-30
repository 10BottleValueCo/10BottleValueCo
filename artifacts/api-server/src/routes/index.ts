import { Router, type IRouter } from "express";
import analyticsRouter from "./analytics";
import catalogRankingRouter from "./catalog-ranking";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRankingRouter);
router.use(analyticsRouter);

export default router;
