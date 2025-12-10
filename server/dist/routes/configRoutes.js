"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRouter = void 0;
const express_1 = require("express");
const countryConfig_js_1 = require("../config/countryConfig.js");
exports.configRouter = (0, express_1.Router)();
exports.configRouter.get("/countries", async (_req, res, next) => {
    try {
        const configs = await (0, countryConfig_js_1.getCountryConfigs)();
        res.json(configs);
    }
    catch (error) {
        next(error);
    }
});
exports.configRouter.get("/countries/:id", async (req, res, next) => {
    try {
        const country = await (0, countryConfig_js_1.getCountryConfig)(req.params.id);
        if (!country) {
            return res.status(404).json({ message: "Country not found" });
        }
        res.json(country);
    }
    catch (error) {
        next(error);
    }
});
