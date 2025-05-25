"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            Verifying your Techlympics participant account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          {verificationStatus === "loading" && (
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Verifying your email...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a moment.</p>
            </div>
          )}

          {verificationStatus === "success" && (
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-700">Email verification successful!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your account has been activated. You can now sign in to your account.
              </p>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-lg font-medium text-red-700">Verification failed</p>
              <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">
                The verification link may be invalid or expired.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {verificationStatus === "success" && (
            <Button
              variant="default"
              className="w-full"
              onClick={() => router.push("/participants/auth/login")}
            >
              Go to Login
            </Button>
          )}
          
          {verificationStatus === "error" && (
            <div className="space-y-2 w-full">
              <Button
                variant="default"
                className="w-full"
                onClick={() => router.push("/participants/auth/register/email")}
              >
                Register Again
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/participants/auth/login")}
              >
                Go to Login
              </Button>
            </div>
          )}
          
          <div className="text-center text-sm text-muted-foreground mt-2">
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              Return to Home
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
