import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import ContestsTable from './_components/contests-table';

export default async function ContestsPage() {
  const user = await getCurrentUser();
  
  // Check if user is authenticated
  if (!user) {
    redirect("/organizer/auth/login?redirect=/organizer/contests");
  }
  
  // Check if user has required role
  if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
    // Redirect to dashboard if they don't have permission
    redirect("/organizer/dashboard");
  }

  // Fetch contests from database
  const contestsData = await prisma.contest.findMany({
    include: {
      targetgroup: true,
      theme: true
    },
    orderBy: {
      startDate: 'desc'
    }
  });
  
  // Transform data to match the Contest type expected by ContestsTable
  const contests = contestsData.map(contest => {
    // Create a properly typed contest object
    const transformedContest = {
      id: contest.id,
      code: contest.code,
      name: contest.name,
      contestType: contest.contestType,
      participation_mode: contest.participation_mode || 'INDIVIDUAL',
      maxMembersPerTeam: contest.maxMembersPerTeam,
      startDate: contest.startDate,
      endDate: contest.endDate,
      // Set targetgroups as an array
      targetgroups: [] as { id: number; name: string }[],
      // Set theme with proper structure
      theme: null as { id: number; name: string; logoPath?: string | null } | null
    };
    
    // Handle targetgroups
    if (contest.targetgroup) {
      // First check if it's an array
      if (Array.isArray(contest.targetgroup)) {
        // Ensure we properly type the array elements
        transformedContest.targetgroups = contest.targetgroup.map((tg: any) => ({
          id: tg.id,
          name: tg.name
        }));
      } 
      // Then check if it's a single object
      else if (!Array.isArray(contest.targetgroup) && typeof contest.targetgroup === 'object' && contest.targetgroup !== null) {
        // Add type assertion to help TypeScript understand the structure
        const targetGroup = contest.targetgroup as { id: number; name: string };
        transformedContest.targetgroups = [{
          id: targetGroup.id,
          name: targetGroup.name
        }];
      }
    }
    
    // Handle theme
    if (contest.theme && typeof contest.theme === 'object' && contest.theme !== null) {
      // Add type assertion to help TypeScript understand the structure
      const theme = contest.theme as { id: number; name: string; logoPath?: string | null };
      transformedContest.theme = {
        id: theme.id,
        name: theme.name,
        logoPath: theme.logoPath
      };
    }
    
    return transformedContest;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contest Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage Techlympics contests
          </p>
        </div>
        <Link href="/organizer/contests/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Contest
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Contests</CardTitle>
          <CardDescription>
            View, edit, and manage all Techlympics contests. Use filters and sorting to find specific contests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Client-side component for contests table with filtering and sorting */}
          <ContestsTable initialContests={contests} />
        </CardContent>
      </Card>
    </div>
  );
}
