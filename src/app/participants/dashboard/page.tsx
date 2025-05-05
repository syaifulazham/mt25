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
import DashboardClient from "./_components/dashboard-client";

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
  
  // Pass the user data to the client component
  return <DashboardClient user={user} userDetails={userDetails} />;

}
