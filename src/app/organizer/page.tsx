import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

export default async function OrganizerPage() {
  // Get the session
  const session = await getServerSession(authOptions);
  
  // If no session, redirect to login
  if (!session || !session.user) {
    redirect("/organizer/auth/login?redirect=/organizer/dashboard");
  }
  
  // If authenticated, redirect to dashboard
  redirect("/organizer/dashboard");
}
