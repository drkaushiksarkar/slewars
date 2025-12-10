"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataRouter = void 0;
const express_1 = require("express");
const dashboardService_js_1 = require("../services/dashboardService.js");
const geojsonService_js_1 = require("../services/geojsonService.js");
exports.dataRouter = (0, express_1.Router)();
exports.dataRouter.get("/overview", async (req, res, next) => {
    try {
        const country = req.query.country?.toLowerCase();
        if (!country) {
            return res.status(400).json({ message: "country query param is required" });
        }
        const source = req.query.source ?? undefined;
        const payload = await dashboardService_js_1.dashboardService.getOverview(country, source);
        res.json(payload);
    }
    catch (error) {
        next(error);
    }
});
exports.dataRouter.get("/geojson/sierra-leone", async (_req, res, next) => {
    try {
        const data = await geojsonService_js_1.geojsonService.getSierraLeoneAdm1();
        res.json(data);
    }
    catch (error) {
        next(error);
    }
});
