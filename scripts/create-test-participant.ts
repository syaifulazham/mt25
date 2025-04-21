import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if test participant already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        username: 'testparticipant',
      },
    });

    if (existingUser) {
      console.log('Test participant user already exists.');
      return;
    }

    // Create a test participant user
    const hashedPassword = await hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        name: 'Test Participant',
        email: 'testparticipant@example.com',
        username: 'testparticipant',
        password: hashedPassword,
        role: 'PARTICIPANT',
        isActive: true,
        updatedAt: new Date(),
      },
    });

    console.log('Test participant user created successfully:');
    console.log({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error('Error creating test participant user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
