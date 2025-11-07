import { Router } from "express";
import { configRouter } from "./configRoutes";
import { dataRouter } from "./dataRoutes";
import { mlRouter } from "./mlRoutes";
import { dhis2Router } from "./dhis2Routes";

const router = Router();

router.use("/config", configRouter);
router.use("/data", dataRouter);
router.use("/ml", mlRouter);
router.use("/dhis2", dhis2Router);

export default router;
