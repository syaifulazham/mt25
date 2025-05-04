import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Mark this page as dynamic since it uses session which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ContingentSummary from "./_components/contingent-summary";
import ProfileSummary from "./_components/profile-summary";
import ContestantsSummary from "./_components/contestants-summary";
import TeamsSummary from "./_components/teams-summary";
import PendingRequestsAlert from "./_components/pending-requests-alert";
import VideoGallery from "./_components/video-gallery";
import prisma from "@/lib/prisma";

// Import gradient card styles
import "@/styles/gradient-cards.css";

export const metadata: Metadata = {
  title: "Dashboard | Techlympics 2025 Participant Portal",
  description: "Manage your Techlympics 2025 participation",
};

export default async function DashboardPage() {
  // Use getSessionUser with a custom login path to ensure we redirect to the participant login
  const user = await getSessionUser({ 
    redirectToLogin: true,
    loginPath: "/participants/auth/login"
  });
  
  // If we get here, we have a valid user
  // But add an extra check to satisfy TypeScript and handle edge cases
  if (!user) {
    redirect("/participants/auth/login");
    return null; // This line will never execute due to the redirect, but helps TypeScript
  }
  
  // Fetch additional user details for the profile summary
  let userDetails: any = user;
  
  // Check if this is a participant user (all users in the participant section should be)
  try {
    const participantDetails = await prisma.user_participant.findUnique({
      where: { id: Number(user.id) },
      include: {
        school: {
          select: {
            name: true
          }
        },
        higherInstitution: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (participantDetails) {
      userDetails = {
        ...user,
        phoneNumber: participantDetails.phoneNumber,
        gender: participantDetails.gender,
        dateOfBirth: participantDetails.dateOfBirth ? participantDetails.dateOfBirth.toISOString() : null,
        schoolId: participantDetails.schoolId,
        higherInstId: participantDetails.higherInstId,
        school: participantDetails.school,
        higherInstitution: participantDetails.higherInstitution
      };
    }
  } catch (error) {
    console.error("Error fetching participant details:", error);
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome, {user?.name || user?.username}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your profile, teams, and contest participations from your dashboard.
        </p>
      </div>
      
      {/* Pending Requests Alert - only shows if there are pending requests */}
      <PendingRequestsAlert userId={Number(user.id)} participantId={Number(user.id)} />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {/* Profile Summary component */}
        <ProfileSummary user={userDetails} />
        
        {/* Contingent Summary component - now works directly with participant ID */}
        <ContingentSummary participantId={Number(user.id)} />
        
        {/* Contestants Summary component */}
        <ContestantsSummary userId={Number(user.id)} />
        
        {/* Teams Summary component */}
        <TeamsSummary participantId={Number(user.id)} />
      </div>
      
      {/* Video Gallery */}
      <VideoGallery />
      
      <div className="fixed bottom-4 right-4 md:hidden">
        <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" asChild>
          <Link href="/participants/profile">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="sr-only">Profile</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
