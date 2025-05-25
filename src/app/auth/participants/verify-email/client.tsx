'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from '@/lib/i18n/language-context';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { t } = useLanguage();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationStatus("error");
        setErrorMessage("Verification token is missing");
        return;
      }

      try {
        const response = await fetch(`/api/participants/verify-email?token=${token}`, {
          method: "GET",
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationStatus("success");
        } else {
          setVerificationStatus("error");
          setErrorMessage(data.error || "Email verification failed");
        }
      } catch (error) {
        setVerificationStatus("error");
        setErrorMessage("An unexpected error occurred");
        console.error("Verification error:", error);
      }
    };

    verifyEmail();
  }, [token]);

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
        
        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold text-white text-center mb-6">Email Verification</h2>
          
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            {verificationStatus === "loading" && (
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-16 w-16 text-yellow-400 animate-spin mb-4" />
                <p className="text-lg font-medium text-white">Verifying your email...</p>
                <p className="text-sm text-zinc-300 mt-2">This may take a moment.</p>
              </div>
            )}

            {verificationStatus === "success" && (
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-16 w-16 text-green-400 mb-4" />
                <p className="text-lg font-medium text-white">Email verification successful!</p>
                <p className="text-sm text-zinc-300 mt-2">
                  Your account has been activated. You can now sign in to your account.
                </p>
                
                <Button
                  variant="default"
                  className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-zinc-900"
                  onClick={() => router.push("/auth/participants/login")}
                >
                  Go to Login
                </Button>
              </div>
            )}

            {verificationStatus === "error" && (
              <div className="flex flex-col items-center text-center">
                <XCircle className="h-16 w-16 text-red-400 mb-4" />
                <p className="text-lg font-medium text-white">Verification failed</p>
                
                <Alert variant="destructive" className="mt-4 mb-4 bg-red-900/70 border-red-600 text-white">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
                
                <p className="text-sm text-zinc-300 mt-1">
                  The verification link may be invalid or expired.
                </p>
                
                <div className="space-y-3 w-full mt-6">
                  <Button
                    variant="default"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-zinc-900"
                    onClick={() => router.push("/auth/participants/register/email")}
                  >
                    Register Again
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-white text-white hover:bg-white/20"
                    onClick={() => router.push("/auth/participants/login")}
                  >
                    Go to Login
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
