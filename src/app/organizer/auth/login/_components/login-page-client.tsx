"use client";

import Link from "next/link";
import { SessionProvider } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import LoginForm from "../login-form";

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get("message");

  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 p-4">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-card p-8 shadow-lg">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <Link href="/" className="mb-4">
              <div className="flex items-center justify-center">
                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
                  TECHLYMPICS 2025
                </span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
              Organizer Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the administrator panel
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
              {decodeURIComponent(errorMessage)}
            </div>
          )}

          <LoginForm />

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>
              Need help?{" "}
              <Link href="/contact" className="text-primary hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
