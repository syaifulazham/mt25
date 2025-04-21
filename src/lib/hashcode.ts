import crypto from 'crypto';

/**
 * Generates a unique hashcode for a contestant based on their personal information
 * @param name Contestant's full name
 * @param ic Contestant's IC number
 * @param timestamp Current timestamp to ensure uniqueness
 * @returns A unique hashcode string
 */
export function generateContestantHashcode(name: string, ic: string, timestamp: number = Date.now()): string {
  // Create a string combining all the input data
  const dataString = `${name.toLowerCase().trim()}-${ic.trim()}-${timestamp}`;
  
  // Generate a SHA-256 hash
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  
  // Return a shortened version (first 12 characters) for better usability
  return hash.substring(0, 12).toUpperCase();
}

/**
 * Validates if a hashcode follows the correct format
 * @param hashcode The hashcode to validate
 * @returns Boolean indicating if the hashcode is valid
 */
export function validateHashcode(hashcode: string): boolean {
  // Check if the hashcode is a 12-character hexadecimal string
  const hashcodeRegex = /^[0-9A-F]{12}$/;
  return hashcodeRegex.test(hashcode);
}
