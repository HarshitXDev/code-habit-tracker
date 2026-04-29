import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import statsRouter from "./stats";
import profileRouter from "./profile";
import syncRouter from "./sync";
import rolloverRouter from "./rollover";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(statsRouter);
router.use(profileRouter);
router.use(syncRouter);
router.use(rolloverRouter);

export default router;
