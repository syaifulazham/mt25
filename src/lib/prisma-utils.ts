import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Helper function to execute Prisma queries with proper connection management
 * This ensures connections are properly handled in serverless environments
 * 
 * @param queryFn Function that uses the prisma client to perform database operations
 * @returns Result of the database operations
 */
export async function prismaExecute<T>(
  queryFn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    // Execute the query using the provided Prisma client
    const result = await queryFn(prisma);
    return result;
  } catch (error) {
    console.error('Error executing Prisma query:', error);
    throw error;
  }
}
