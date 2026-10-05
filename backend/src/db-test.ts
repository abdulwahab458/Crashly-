import { prisma } from "./utils/db";


async function main() {
  const apiKeys = await prisma.apiKey.findMany({
  include: {
    project: true
  }
});

  console.log(apiKeys);

  await prisma.$disconnect();
}

main();