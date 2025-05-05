import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import ContingentManagerClient from "./_components/contingent-manager-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function ContingentsPage() {
  // Get the current user
  const user = await getCurrentUser();
  
  // If no user, redirect to login
  if (!user) {
    redirect("/participants/auth/login");
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contingent Management</h1>
        <p className="text-muted-foreground">
          Create, join, or manage your contingent for Techlympics 2025
        </p>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <ContingentManagerClient userId={(user as any).id} />
      </Suspense>
    </div>
  );
}
