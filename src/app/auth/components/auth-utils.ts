'use client';

import { signIn } from 'next-auth/react';
import { LoginFormValues, AuthResult } from '../types';

/**
 * Unified login handler for both organizer and participant users
 * The credential type will determine which user type is being authenticated
 */
export async function handleLoginSubmit(values: LoginFormValues): Promise<AuthResult> {
  try {
    const result = await signIn('credentials', {
      redirect: false,
      username: values.username,
      password: values.password,
      callbackUrl: values.callbackUrl,
    });

    if (result?.error) {
      return {
        success: false,
        message: result.error === 'CredentialsSignin' 
          ? 'Invalid username or password' 
          : result.error,
      };
    }

    return {
      success: true,
      message: 'Login successful',
      redirect: result?.url || values.callbackUrl,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Determine return path based on user type and intended destination
 */
export function getReturnPath(userType: 'organizer' | 'participant', path?: string): string {
  if (path && path.startsWith('/')) {
    return path;
  }
  
  return userType === 'organizer' ? '/organizer/dashboard' : '/participants/dashboard';
}
