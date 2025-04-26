'use client';

import { user_role } from '@prisma/client';
import * as jose from 'jose';

// Constants
const JWT_SECRET = 'techlympics-2025-secret-key'; // Hardcoded for client-side use
const TOKEN_EXPIRY = '8h';
const COOKIE_NAME = 'techlympics-auth';

// Mock user for development
const MOCK_USER = {
  id: 1,
  name: 'Development User',
  email: 'dev@techlympics.com',
  role: 'ADMIN' as user_role,
  username: 'devuser'
};

// Generate a token for the mock user
export async function generateMockToken(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  return await new jose.SignJWT({
    id: MOCK_USER.id,
    email: MOCK_USER.email,
    role: MOCK_USER.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

// Set a mock auth cookie for development
export async function setMockAuthCookie(): Promise<void> {
  try {
    const token = await generateMockToken();
    
    // This function should be called client-side
    document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 8}`; // 8 hours
    
    // Also store in localStorage as a backup
    localStorage.setItem(COOKIE_NAME, token);
    
    console.log('Mock auth cookie set successfully');
    return Promise.resolve();
  } catch (error) {
    console.error('Error setting mock auth cookie:', error);
    return Promise.reject(error);
  }
}

// Check if we have an auth cookie
export function hasMockAuthCookie(): boolean {
  const hasCookie = document.cookie.includes(COOKIE_NAME);
  const hasLocalStorage = !!localStorage.getItem(COOKIE_NAME);
  return hasCookie || hasLocalStorage;
}

// Clear the auth cookie
export function clearMockAuthCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  localStorage.removeItem(COOKIE_NAME);
}
