import { PrismaClient } from '@prisma/client';
import { hashPassword } from './auth';

const prisma = new PrismaClient();

export async function initializeDatabase() {
  try {
    console.log('Checking for existing admin users...');
    
    // Check if any admin users exist
    const adminCount = await prisma.user.count({
      where: {
        role: 'ADMIN',
      },
    });

    if (adminCount === 0) {
      console.log('No admin users found. Creating default admin user...');
      
      // Create default admin user
      const hashedPassword = await hashPassword('admin123');
      
      await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: 'admin@techlympics.my',
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      
      console.log('Default admin user created successfully.');
    } else {
      console.log(`Found ${adminCount} existing admin users. Skipping initialization.`);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}
