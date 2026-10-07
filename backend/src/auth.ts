import bcrypt from "bcrypt";
import { prisma } from "./utils/db.js";

export async function authenticateApiKey(apiKey: string) {
    const separatorIndex = apiKey.indexOf("_", "etrk_live_".length);

    if (separatorIndex === -1) {
        return null;
    }

    const keyPrefix = apiKey.slice(0, separatorIndex);

    const key = await prisma.apiKey.findUnique({
        where: {
            keyPrefix
        },
        include: {
            project: true
        }
    });

    if (!key) {
        return null;
    }

    const valid = await bcrypt.compare(apiKey, key.keyHash);

    if (!valid) {
        return null;
    }

    return key.project;
}

