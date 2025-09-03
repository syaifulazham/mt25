import { Suspense } from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StateSelector from "../_components/state-selector";

// Import skeleton components
import StatsSkeleton from "../_components/skeletons/stats-skeleton";
import ChartSkeleton from "../_components/skeletons/chart-skeleton";

// Import section components
import BasicStatsSection from "../_components/basic-stats-section-state";
import GenderDistributionSection from "../_components/gender-distribution-state-section";
import EducationLevelSection from "../_components/education-level-state-section";
import SchoolCategorySection from "../_components/school-category-state-section";
import SchoolPpdDistributionSection from "./_components/school-ppd-distribution-section";

// Mark this page as dynamic since it uses session
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "State Dashboard | Organizer Portal",
  description: "State-specific dashboard for Techlympics 2025 event management",
};

// Function to get state name by ID
async function getStateName(stateId: string) {
  try {
    // Add prisma query to get state name based on ID
    const { prisma } = await import("@/lib/prisma");
    const state = await prisma.state.findUnique({
      where: { id: parseInt(stateId) },
      select: { name: true }
    });
    return state?.name || "Unknown State";
  } catch (error) {
    console.error("Error fetching state name:", error);
    return "Unknown State";
  }
}

export default async function StateDashboardPage({ params }: { params: { stateId: string } }) {
  // Get the session using Next Auth
  const session = await getServerSession(authOptions);
  
  // If not authenticated, redirect to login
  if (!session || !session.user) {
    // Use the unified organizer login path
    const loginPath = "/auth/organizer/login";
    redirect(`${loginPath}?redirect=/organizer/dashboard`);
  }

  // Get user from session
  const user = session.user;
  
  // Get state name
  const stateName = await getStateName(params.stateId);
  
  // For the role check, we'll be more permissive with the dashboard
  const isAdmin = user.role === 'ADMIN';
  
  return (
    <div className="container mx-auto p-4 flex flex-col gap-8">
      {/* Header section */}
      <section className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Link href="/organizer/dashboard" className="flex items-center text-primary hover:text-primary/80">
              <ArrowLeft className="mr-1 h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <StateSelector />
        </div>
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight">{stateName} Dashboard</h1>
          <p className="text-muted-foreground">
            Showing statistics for {stateName}
          </p>
        </div>
      </section>
      
      {/* Basic Stats - Highest priority, loads first */}
      <section className="w-full">
        <Suspense fallback={<StatsSkeleton />}>
          <BasicStatsSection stateId={params.stateId} isAdmin={isAdmin} />
        </Suspense>
      </section>
      
      {/* Secondary Charts - Now in second row */}
      <section className="w-full min-h-[350px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
          <div className="min-h-[300px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <GenderDistributionSection stateId={params.stateId} />
            </Suspense>
          </div>
          
          <div className="min-h-[300px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <EducationLevelSection stateId={params.stateId} />
            </Suspense>
          </div>
          
          <div className="min-h-[300px] h-full">
            <Suspense fallback={<ChartSkeleton className="h-full" />}>
              <SchoolCategorySection stateId={params.stateId} />
            </Suspense>
          </div>
        </div>
      </section>
      
      {/* PPD Distribution - For school contingents */}
      <section className="w-full min-h-[450px]">
        <div className="h-full">
          <Suspense fallback={<ChartSkeleton className="h-full" />}>
            <SchoolPpdDistributionSection stateId={params.stateId} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
