import { prisma } from "./utils/db";

async function main(){

  const events = await prisma.errorEvent.findMany({
    include: {
      project: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  
  console.log(events);
  
  await prisma.$disconnect();
}

main();