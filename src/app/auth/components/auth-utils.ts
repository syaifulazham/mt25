'use client';

import { signIn } from 'next-auth/react';
import { LoginFormValues, AuthResult } from '../types';

/**
 * Unified login handler for both organizer and participant users
 * The credential type will determine which user type is being authenticated
 */
export async function handleLoginSubmit(values: LoginFormValues): Promise<AuthResult> {
  try {
    console.log('Login attempt with:', { 
      username: values.username,
      callbackUrl: values.callbackUrl 
    });

    // Force callbackUrl to be absolute if it's not already
    let callbackUrl = values.callbackUrl;
    if (callbackUrl && !callbackUrl.startsWith('http')) {
      // In browser context, we can use window.location to build absolute URL
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        callbackUrl = `${origin}${callbackUrl.startsWith('/') ? '' : '/'}${callbackUrl}`;
      }
    }

    console.log('Using callbackUrl:', callbackUrl);

    const result = await signIn('credentials', {
      redirect: false,
      username: values.username,
      password: values.password,
      callbackUrl: callbackUrl,
    });

    console.log('Sign in result:', result);

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
      redirect: result?.url || callbackUrl || '/organizer/dashboard',
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
