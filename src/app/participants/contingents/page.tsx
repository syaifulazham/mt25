import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import ContingentManager from "./_components/contingent-manager";

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
        <h1 className="text-2xl font-bold tracking-tight">Manage Your Contingent</h1>
        <p className="text-muted-foreground">
          Select your school or higher institution to create or join a contingent
        </p>
      </div>
      
      <ContingentManager userId={(user as any).id} />
    </div>
  );
}
