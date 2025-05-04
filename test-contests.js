// Simple script to test fetching contests directly from the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Querying contests table...');
    const contests = await prisma.contest.findMany();
    console.log(`Found ${contests.length} contest records:`);
    console.log(JSON.stringify(contests.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      type: c.contestType
    })), null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
