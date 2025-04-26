import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create test participant user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const testParticipant = await prisma.user.upsert({
    where: { username: 'testparticipant' },
    update: {},
    create: {
      name: 'Test Participant',
      email: 'testparticipant@example.com',
      username: 'testparticipant',
      password: hashedPassword,
      role: 'PARTICIPANTS_MANAGER',
      isActive: true,
      updatedAt: new Date(),
    },
  });
  
  console.log({ testParticipant });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
