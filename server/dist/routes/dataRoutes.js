import { Router } from "express";
import { dashboardService } from "../services/dashboardService.js";
import { geojsonService } from "../services/geojsonService.js";
export const dataRouter = Router();
dataRouter.get("/overview", async (req, res, next) => {
    try {
        const country = req.query.country?.toLowerCase();
        if (!country) {
            return res.status(400).json({ message: "country query param is required" });
        }
        const source = req.query.source ?? undefined;
        const payload = await dashboardService.getOverview(country, source);
        res.json(payload);
    }
    catch (error) {
        next(error);
    }
});
dataRouter.get("/geojson/sierra-leone", async (_req, res, next) => {
    try {
        const data = await geojsonService.getSierraLeoneAdm1();
        res.json(data);
    }
    catch (error) {
        next(error);
    }
});
