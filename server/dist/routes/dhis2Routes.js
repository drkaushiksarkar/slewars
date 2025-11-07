"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dhis2Router = void 0;
const express_1 = require("express");
const dhis2Service_1 = require("../services/dhis2Service");
exports.dhis2Router = (0, express_1.Router)();
exports.dhis2Router.get("/analytics", async (req, res, next) => {
    try {
        const data = await dhis2Service_1.dhis2Service.fetchAnalytics(req.query);
        res.json(data);
    }
    catch (error) {
        next(error);
    }
});
exports.dhis2Router.get("/health", async (_req, res) => {
    const result = await dhis2Service_1.dhis2Service.healthCheck();
    res.json(result);
});
