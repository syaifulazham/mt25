import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// Mark this page as dynamic since it uses session
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function OrganizerPage() {
  // Get the session
  const session = await getServerSession(authOptions);
  
  // If no session, redirect to login
  if (!session || !session.user) {
    // Use the new unified organizer login path
    const loginPath = "/auth/organizer/login";
    
    redirect(`${loginPath}?redirect=/organizer/dashboard`);
  }
  
  // If authenticated, redirect to dashboard
  redirect("/organizer/dashboard");
}
