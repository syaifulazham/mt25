"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState(false);
  const error = searchParams.get("error");

  // Check if Google OAuth is configured
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/auth/debug');
        const data = await response.json();
        
        if (!data.environment.GOOGLE_CLIENT_ID.includes('✓') || 
            !data.environment.GOOGLE_CLIENT_SECRET.includes('✓')) {
          setConfigError(true);
        }
      } catch (err) {
        console.error('Failed to check OAuth configuration:', err);
      }
    };
    
    checkConfig();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl: "/participants/dashboard",
      });
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {error === "AccessDenied" 
              ? "You don't have permission to access this resource." 
              : "An error occurred during sign in. Please try again."}
          </AlertDescription>
        </Alert>
      )}
      
      {configError && (
        <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Configuration Issue</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Google authentication is not properly configured. Please contact the administrator.
            <br />
            <span className="font-mono text-xs">Missing: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET</span>
          </AlertDescription>
        </Alert>
      )}
      
      <Button
        variant="outline"
        type="button"
        disabled={isLoading || configError}
        className="w-full flex items-center justify-center gap-2"
        onClick={handleGoogleLogin}
      >
        <FcGoogle className="h-5 w-5" />
        <span>{isLoading ? "Signing in..." : "Sign in with Google"}</span>
      </Button>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Participant Login
          </span>
        </div>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Participants can only sign in using Google authentication.
        </p>
      </div>
    </div>
  );
}
