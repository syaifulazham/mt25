'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '../../components/login-form';
import { LoginFormValues } from '../../types';
import { debugSignIn, performAuthRedirect } from '../../components/session-debug-helper';

export default function OrganizerLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get error message and callback URL from query params
  const errorMessage = searchParams?.get('error') || searchParams?.get('message') || '';
  
  // Ensure we have a valid callback URL - default to dashboard if not specified
  const callbackUrl = searchParams?.get('callbackUrl') || 
                      searchParams?.get('redirect') || 
                      '/organizer/dashboard';
                      
  console.log('Initial callback URL:', callbackUrl);
  
  const handleSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('[ORGANIZER LOGIN] Starting authentication, callbackUrl:', callbackUrl);
      
      // Use the enhanced debug sign-in function
      const result = await debugSignIn('credentials', {
        redirect: false,
        username: values.username,
        password: values.password,
        callbackUrl: callbackUrl as string,
      });
      
      if (result?.error) {
        console.error('[ORGANIZER LOGIN] Authentication error:', result.error);
        setError(result.error || 'Login failed. Please check your credentials.');
        setIsLoading(false);
      } else if (result?.url) {
        // Successful login
        console.log('[ORGANIZER LOGIN] Authentication successful, redirecting to:', result.url);
        
        // Use enhanced redirect with diagnostics
        performAuthRedirect(result.url);
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', e);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <LoginForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error || errorMessage}
        callbackUrl={callbackUrl as string}
        userType="organizer"
      />
    </div>
  );
}
