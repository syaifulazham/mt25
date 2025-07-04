import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create a PrismaClient with connection management best practices
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Connection management happens through the singleton pattern
    // and Next.js best practices outlined at https://pris.ly/d/help/next-js-best-practices
  });
};

// Create a singleton PrismaClient instance
export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Helper function to execute a Prisma query using the singleton Prisma client
 * This ensures better connection management in serverless environments
 */
export async function prismaExecute<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  let result: T;
  try {
    // Execute the query using the singleton Prisma client instance
    result = await callback(prisma);
    return result;
  } catch (error) {
    console.error('Prisma query error:', error);
    throw error;
  } finally {
    // No need to manually disconnect because we're using a singleton
    // This pattern is recommended by Prisma for Next.js serverless functions
    // See: https://pris.ly/d/help/next-js-best-practices
  }
}

export default prisma;
