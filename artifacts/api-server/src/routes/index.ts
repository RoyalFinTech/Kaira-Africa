import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import teamRouter from "./team";
import customersRouter from "./customers";
import transactionsRouter from "./transactions";
import activityRouter from "./activity";
import notificationsRouter from "./notifications";
import analyticsRouter from "./analytics";
import reportsRouter from "./reports";
import crmRouter from "./crm";
import inventoryRouter from "./inventory";
import aiRouter from "./ai";
import adminPlatformRouter from "./admin-platform";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(teamRouter);
router.use(customersRouter);
router.use(transactionsRouter);
router.use(activityRouter);
router.use(notificationsRouter);
router.use(analyticsRouter);
router.use(reportsRouter);
router.use(crmRouter);
router.use(inventoryRouter);
router.use(aiRouter);
router.use(adminPlatformRouter);

export default router;
