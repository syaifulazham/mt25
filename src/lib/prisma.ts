import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create a singleton PrismaClient instance
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to execute a Prisma query and properly close the connection
export async function prismaExecute<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    // Execute the query
    return await callback(prisma);
  } finally {
    // Explicitly disconnect in production/serverless environments
    // In development, we keep the connection open
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
}

export default prisma;
