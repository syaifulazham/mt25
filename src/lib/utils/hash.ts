import crypto from 'crypto';

/**
 * Generates a unique hash code for contestants
 * @returns A unique hash string
 */
export async function generateUniqueHash(): Promise<string> {
  return crypto.randomBytes(16).toString('hex');
}
