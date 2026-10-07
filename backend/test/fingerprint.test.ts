import { describe, expect, it } from "vitest";
import { generateFingerprint } from "../src/utils/fingerprint";


describe("generateFingerprint", () => {
    it("generates the same fingerprint for the same error", () => {
        const first = generateFingerprint(
            "project-1",
            "Error",
            "Database connection failed",
            "Error: Database connection failed"
        );

        const second = generateFingerprint(
            "project-1",
            "Error",
            "Database connection failed",
            "Error: Database connection failed"
        );

        expect(first).toBe(second);
    });

    it("generates different fingerprints for different projects", () => {
        const projectA = generateFingerprint(
            "project-a",
            "Error",
            "Database connection failed",
            "Error: Database connection failed"
        );

        const projectB = generateFingerprint(
            "project-b",
            "Error",
            "Database connection failed",
            "Error: Database connection failed"
        );

        expect(projectA).not.toBe(projectB);
    });

    it("generates different fingerprints for different errors", () => {
        const first = generateFingerprint(
            "project-1",
            "Error",
            "Database connection failed",
            "Error: Database connection failed"
        );

        const second = generateFingerprint(
            "project-1",
            "Error",
            "Redis connection failed",
            "Error: Redis connection failed"
        );

        expect(first).not.toBe(second);
    });
});