"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import EmailRegistrationForm from "./email-registration-form";

export default function EmailRegisterPageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're authenticated and not already on the dashboard page
    if (status === "authenticated" && window.location.pathname !== "/participants/dashboard") {
      router.push("/participants/dashboard");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>
            Register with email for your Techlympics participant account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <EmailRegistrationForm />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/participants/auth/login" className="text-primary underline-offset-4 hover:underline">
              Sign in here
            </Link>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/participants/auth/register" className="text-primary underline-offset-4 hover:underline">
              Back to registration options
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
