import { generateContestantHashcode } from './hashcode';
import prisma from '@/lib/prisma';

/**
 * Middleware function to ensure contestant hashcodes are properly handled.
 * If querying a contestant by ID, this function will generate a virtual hashcode
 * based on the contestant's data.
 * 
 * @param contestant The contestant data from the database
 * @returns The contestant with a hashcode property (generated if not in DB)
 */
export async function ensureContestantHashcode(contestant: any): Promise<any> {
  // If the contestant already has a hashcode in a custom property, return as-is
  if (contestant.hashcode) {
    return contestant;
  }
  
  // Generate a hashcode based on contestant data
  const hashcode = generateContestantHashcode(
    contestant.name,
    contestant.ic || contestant.id.toString(),
    new Date(contestant.createdAt).getTime()
  );
  
  // Return the contestant with the generated hashcode
  return {
    ...contestant,
    hashcode
  };
}

/**
 * Generates hashcodes for multiple contestants
 * 
 * @param contestants Array of contestant objects
 * @returns Array of contestants with hashcodes
 */
export async function ensureContestantHashcodes(contestants: any[]): Promise<any[]> {
  return Promise.all(contestants.map(contestant => ensureContestantHashcode(contestant)));
}

/**
 * Finds a contestant by their hashcode
 * 
 * @param hashcode The hashcode to search for
 * @returns The contestant with the matching hashcode, or null if not found
 */
export async function findContestantByHashcode(hashcode: string): Promise<any | null> {
  // First try to find the contestant with the hashcode as a property
  const contestants = await prisma.contestant.findMany({
    include: {
      contingent: true,
      contests: {
        include: {
          contest: true
        }
      }
    }
  });
  
  // Check all contestants to see if any generate a matching hashcode
  for (const contestant of contestants) {
    const generatedHashcode = generateContestantHashcode(
      contestant.name,
      contestant.ic || contestant.id.toString(),
      new Date(contestant.createdAt).getTime()
    );
    
    if (generatedHashcode === hashcode) {
      return {
        ...contestant,
        hashcode: generatedHashcode
      };
    }
  }
  
  return null;
}
