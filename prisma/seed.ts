import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Check if user table is empty
  const userCount = await prisma.user.count();
  
  // Create admin password (use env var in production)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const participantPassword = await bcrypt.hash('password123', 10);
  
  // If no users exist, create initial ADMIN user
  if (userCount === 0) {
    const adminUser = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'admin@techlympics.my',
        username: 'admin',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true,
        updatedAt: new Date(),
      },
    });
    
    console.log('Created initial admin user:', { adminUser });
  }
  
  // Create test participant user if it doesn't exist
  const testParticipant = await prisma.user.upsert({
    where: { username: 'testparticipant' },
    update: {},
    create: {
      name: 'Test Participant',
      email: 'testparticipant@example.com',
      username: 'testparticipant',
      password: participantPassword,
      role: 'PARTICIPANTS_MANAGER',
      isActive: true,
      updatedAt: new Date(),
    },
  });
  
  console.log('Test participant:', { testParticipant });
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
