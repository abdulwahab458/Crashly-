import type { ErrorRequestHandler } from "express";
import type { ErrorTracker } from "../index.js";

export function createExpressErrorHandler(
    tracker: ErrorTracker
): ErrorRequestHandler {
    return (error, req, res, next) => {
        tracker.captureException(error);

        next(error);
    };
}