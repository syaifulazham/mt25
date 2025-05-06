import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ContestsClient from "./_components/contests-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Contests | Techlympics 2025",
  description: "Browse and register for Techlympics 2025 contests",
};

export default async function ContestsPage() {
  // Get the current user
  const user = await getCurrentUser();
  
  // If no user, redirect to login
  if (!user) {
    redirect("/participants/auth/login");
  }

  return (
    <div className="container py-6 max-w-6xl">
      {/* Logo and heading will be provided by the client component */}
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <ContestsClient />
      </Suspense>
    </div>
  );
}
