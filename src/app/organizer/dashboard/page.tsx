import { Suspense } from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";

// Import skeleton components
import StatsSkeleton from "./_components/skeletons/stats-skeleton";
import ChartSkeleton from "./_components/skeletons/chart-skeleton";
import ActivitySkeleton from "./_components/skeletons/activity-skeleton";

// Import our section components
import DashboardHeader from "./_components/dashboard-header";
import StateSelector from "./_components/state-selector";
import BasicStatsSection from "./_components/basic-stats-section";
import ContingentStateSection from "./_components/contingent-state-section";
import ParticipationStateSection from "./_components/participation-state-section";
import GenderDistributionSection from "./_components/gender-distribution-section";
import EducationLevelSection from "./_components/education-level-section";
import SchoolCategorySection from "./_components/school-category-section";
import ContestParticipationByNameSection from "./_components/contest-participation-by-name-section";
import ActivitySection from "./_components/activity-section";
import DashboardDebug from "./_components/dashboard-debug";

// Mark this page as dynamic since it uses session
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Dashboard | Organizer Portal",
  description: "Administrator dashboard for Techlympics 2025 event management",
};

export default async function DashboardPage() {
  // Get the session using Next Auth
  const session = await getServerSession(authOptions);
  
  // If not authenticated, redirect to login
  if (!session || !session.user) {
    // Use the new unified organizer login path
    const loginPath = "/auth/organizer/login";
    
    redirect(`${loginPath}?redirect=/organizer/dashboard`);
  }

  // Get user from session
  const user = session.user;
  
  // For the role check, we'll be more permissive with the dashboard
  const isAdmin = user.role === 'ADMIN';
  
  return (
    <div className="container mx-auto p-4 flex flex-col gap-8">
      {/* Header section */}
      <section className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <DashboardHeader userName={user.name || user.email || 'User'} />
          <StateSelector />
        </div>
        <DashboardDebug />
      </section>
      
      {/* Basic Stats - Highest priority, loads first */}
      <section className="w-full">
        <Suspense fallback={<StatsSkeleton />}>
          <BasicStatsSection isAdmin={isAdmin} />
        </Suspense>
      </section>
      
      {/* Secondary Charts - Now in second row */}
      <section className="w-full min-h-[350px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
          <div className="min-h-[300px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <GenderDistributionSection />
            </Suspense>
          </div>
          
          <div className="min-h-[300px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <EducationLevelSection />
            </Suspense>
          </div>
          
          <div className="min-h-[300px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <SchoolCategorySection />
            </Suspense>
          </div>
        </div>
      </section>
      
      {/* Main Charts - Now in third row */}
      <section className="w-full min-h-[450px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          <div className="min-h-[400px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <ContingentStateSection />
            </Suspense>
          </div>
          
          <div className="min-h-[400px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <ParticipationStateSection />
            </Suspense>
          </div>
        </div>
      </section>
      
      {/* Contest Participation by Name - Fourth row */}
      <section className="w-full min-h-[550px]">
        <Suspense fallback={<ChartSkeleton className="h-full" />}>
          <ContestParticipationByNameSection />
        </Suspense>
      </section>
      
      {/* Activity Tab - Lowest priority, loads last */}
      <section className="w-full">
        <Suspense fallback={<ActivitySkeleton />}>
          <ActivitySection />
        </Suspense>
      </section>
    </div>
  );
}
