import { Router } from "express";
import { getCountryConfig, getCountryConfigs } from "../config/countryConfig.js";
export const configRouter = Router();
configRouter.get("/countries", async (_req, res, next) => {
    try {
        const configs = await getCountryConfigs();
        res.json(configs);
    }
    catch (error) {
        next(error);
    }
});
configRouter.get("/countries/:id", async (req, res, next) => {
    try {
        const country = await getCountryConfig(req.params.id);
        if (!country) {
            return res.status(404).json({ message: "Country not found" });
        }
        res.json(country);
    }
    catch (error) {
        next(error);
    }
});
