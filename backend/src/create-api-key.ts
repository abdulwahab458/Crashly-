import bcrypt from "bcrypt";
import { prisma } from "./utils/db";

async function main() {
  const rawKey = `etrk_live_${crypto.randomUUID()}`;

  const keyHash = await bcrypt.hash(rawKey, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash,
      projectId: "0a31b13d-266e-4b8c-bb06-f843ca6db336"
    }
  });

  console.log("API Key:", rawKey);
  console.log("Database ID:", apiKey.id);

  await prisma.$disconnect();
}

main();