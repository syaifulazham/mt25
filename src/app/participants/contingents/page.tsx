import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import ContingentManagerClient from "./_components/contingent-manager-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ContingentPageHeader } from "./_components/contingent-page-header";

// Main container without internationalized content
function ContingentPageContent({ userId }: { userId: number }) {  
  return (
    <div className="container py-6 space-y-6">
      <ContingentPageHeader />
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <ContingentManagerClient userId={userId} />
      </Suspense>
    </div>
  );
}

export default async function ContingentsPage() {
  // Get the current user
  const user = await getCurrentUser();
  
  // If no user, redirect to login
  if (!user) {
    redirect("/participants/auth/login");
  }

  return <ContingentPageContent userId={(user as any).id} />;
}
