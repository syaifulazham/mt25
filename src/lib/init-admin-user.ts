import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Creates an initial admin user if no users exist in the database
 * This ensures that the /organizer modules can be accessed on first-time setup
 */
export async function initializeAdminUser() {
  try {
    // Check if any users exist
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('No users found in database. Creating initial admin user...');
      
      // Create default admin credentials
      const defaultUsername = 'admin';
      const defaultPassword = 'Techlympics2025!'; // This should be changed after first login
      const defaultEmail = 'admin@techlympics.my';
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // Create the admin user
      const adminUser = await prisma.user.create({
        data: {
          username: defaultUsername,
          password: hashedPassword,
          email: defaultEmail,
          name: 'System Administrator',
          role: 'ADMIN',
          isActive: true,
          updatedAt: new Date(),
        }
      });
      
      console.log(`Initial admin user created with ID: ${adminUser.id}`);
      console.log('Username: admin');
      console.log('Password: Techlympics2025!');
      console.log('Please change this password after first login!');
      
      return adminUser;
    }
    
    return null; // No user was created
  } catch (error) {
    console.error('Error creating initial admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
