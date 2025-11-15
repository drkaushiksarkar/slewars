import { Router } from "express";
import { dhis2Service } from "../services/dhis2Service.js";

export const dhis2Router = Router();

dhis2Router.get("/analytics", async (req, res, next) => {
  try {
    const data = await dhis2Service.fetchAnalytics(req.query as Record<string, string | string[] | number>);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

dhis2Router.get("/health", async (_req, res) => {
  const result = await dhis2Service.healthCheck();
  res.json(result);
});
