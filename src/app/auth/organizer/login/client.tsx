'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '../../components/login-form';
import { handleLoginSubmit } from '../../components/auth-utils';
import { LoginFormValues } from '../../types';

export default function OrganizerLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get error message and callback URL from query params
  const errorMessage = searchParams?.get('error') || searchParams?.get('message') || '';
  const callbackUrl = searchParams?.get('callbackUrl') || 
                      searchParams?.get('redirect') || 
                      '/organizer/dashboard';
  
  const handleSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await handleLoginSubmit({
        ...values,
        callbackUrl: callbackUrl as string,
      });
      
      if (!result.success) {
        setError(result.message);
        setIsLoading(false);
      } else if (result.redirect) {
        // Successful login
        router.push(result.redirect);
        router.refresh();
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
