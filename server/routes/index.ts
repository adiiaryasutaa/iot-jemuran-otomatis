import { Router } from "express";
import statusRouter from "./status";
import commandRouter from "./command";
import configRouter from "./config";
import logsRouter from "./logs";
import scheduleRouter from "./schedule";
import usersRouter from "./users";

const router = Router();

router.use("/status", statusRouter);
router.use("/command", commandRouter);
router.use("/config", configRouter);
router.use("/logs", logsRouter);
router.use("/schedule", scheduleRouter);
router.use("/users", usersRouter);

export default router;
