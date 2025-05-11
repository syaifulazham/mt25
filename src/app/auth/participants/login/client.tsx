'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '../../components/login-form';
import { handleLoginSubmit } from '../../components/auth-utils';
import { LoginFormValues } from '../../types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';

export default function ParticipantLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get error message and callback URL from query params
  const errorMessage = searchParams?.get('error') || searchParams?.get('message') || '';
  const callbackUrl = searchParams?.get('callbackUrl') || 
                      searchParams?.get('redirect') || 
                      '/participants/dashboard';
  
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
  
  const { t } = useLanguage();
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-white hover:text-yellow-400 transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('auth.back_to_main')}
          </Link>
          
          <h1 className="text-3xl font-bold text-center mb-2">
            <div className="flex flex-col items-center">
              <span className="text-xs sm:text-sm text-white tracking-wider font-medium mb-1">MALAYSIA</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
                {t('hero.title') || 'Techlympics 2025'}
              </span>
            </div>
            <span className="text-xl block mt-2 text-white">{t('hero.subtitle') || 'Extraordinary, Global, Inclusive'}</span>
          </h1>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl">
          <LoginForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error || errorMessage}
            callbackUrl={callbackUrl as string}
            userType="participant"
          />
        </div>
      </div>
    </div>
  );
}
