import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import templatesRouter from "./templates";
import deploymentsRouter from "./deployments";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(templatesRouter);
router.use(deploymentsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(paymentsRouter);

export default router;
