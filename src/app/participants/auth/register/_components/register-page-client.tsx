"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";

export default function RegisterPageClient() {
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
            Register for your Techlympics participant account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 h-12" 
              onClick={() => signIn("google", { callbackUrl: "/participants/dashboard" })}
            >
              <FcGoogle className="h-5 w-5" />
              <span>Register with Google</span>
            </Button>
          </div>
          
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
            <Separator className="absolute top-1/2 w-full" />
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="default" 
              className="w-full h-12" 
              onClick={() => router.push("/participants/auth/register/email")}
            >
              Register with Email
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/participants/auth/login" className="text-primary underline-offset-4 hover:underline">
              Sign in here
            </Link>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Organizer Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
