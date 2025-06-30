const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getZones() {
  try {
    const zones = await prisma.zone.findMany();
    console.log(JSON.stringify(zones, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

getZones();
