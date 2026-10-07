import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "./utils/db";

async function main() {

const projectId = "1a64352b-3f35-4dce-94b3-2cd22e313314";

const project = await prisma.project.findUnique({
    where: {
        id: projectId
    }
});

if (!project) {
    throw new Error("Project not found");
}
const prefixId = crypto.randomBytes(8).toString("hex");
const secret = crypto.randomBytes(32).toString("hex");

const keyPrefix = `etrk_live_${prefixId}`;
const apiKey = `${keyPrefix}_${secret}`;

const keyHash = await bcrypt.hash(apiKey, 12);


await prisma.apiKey.create({
    data: {
        keyPrefix,
        keyHash,
        projectId: project.id
    }
});

console.log("API Key:", apiKey);
console.log("Key Prefix:", keyPrefix);
console.log("Project ID:", project.id);

await prisma.$disconnect();
}

main();