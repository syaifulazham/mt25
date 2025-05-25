'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/lib/i18n/language-context';

export default function ParticipantRegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get error message from query params
  const errorMessage = searchParams?.get('error') || searchParams?.get('message') || '';
  
  const handleGoogleRegister = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/participants/dashboard" });
    } catch (error) {
      console.error("Registration error:", error);
      setIsLoading(false);
      setError('Failed to register with Google');
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
          <CardHeader className="space-y-1 p-0 mb-6">
            <CardTitle className="text-2xl font-bold text-white text-center">Create an Account</CardTitle>
            <CardDescription className="text-zinc-200 text-center">
              Register for your Techlympics participant account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 p-0">
            {(error || errorMessage) && (
              <Alert variant="destructive" className="mb-4 bg-red-900/70 border-red-600 text-white">
                <AlertDescription>
                  {error || errorMessage}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 h-12 bg-white hover:bg-zinc-100" 
                onClick={handleGoogleRegister}
                disabled={isLoading}
              >
                <FcGoogle className="h-5 w-5" />
                <span className="text-zinc-800">{isLoading ? "Registering..." : "Register with Google"}</span>
              </Button>
            </div>
            
            <div className="relative flex justify-center text-xs uppercase my-4">
              <span className="bg-transparent px-2 text-zinc-400 z-10">
                Or continue with
              </span>
              <Separator className="absolute top-1/2 w-full bg-zinc-700" />
            </div>
            
            <div className="space-y-2">
              <Button 
                variant="default" 
                className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-zinc-900"
                onClick={() => router.push("/auth/participants/register/email")}
              >
                Register with Email
              </Button>
            </div>
            
            <div className="text-center text-sm text-zinc-400 mt-6">
              Already have an account?{" "}
              <Link href="/auth/participants/login" className="text-yellow-400 underline-offset-4 hover:underline">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
}
