"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureException = captureException;
function captureException(error) {
    console.log("exception found" + error);
}
captureException(new Error("Database failed"));
