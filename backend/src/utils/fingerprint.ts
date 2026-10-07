import crypto from "crypto";

export function generateFingerprint(
    projectId: string,
    name: string,
    message: string,
    stack?: string
): string {
    const value = [
        projectId,
        name,
        message,
        stack ?? ""
    ].join("|");

    return crypto
        .createHash("sha256")
        .update(value)
        .digest("hex");
}