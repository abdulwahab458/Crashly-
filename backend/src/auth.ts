import bcrypt from "bcrypt";
import { prisma } from "./utils/db";

export async function authenticateApiKey(apiKey: string) {
  const keys = await prisma .apiKey.findMany({
    include: {
      project: true
    }
  });

  for (const key of keys) {
    const valid = await bcrypt.compare(apiKey, key.keyHash);

    if (valid) {
      return key.project;
    }
  }

  return null;
}