import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { ContestForm } from '../../_components/contest-form';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function EditContestPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  
  // Check if user is authenticated
  if (!user) {
    redirect(`/organizer/auth/login?redirect=/organizer/contests/${params.id}/edit`);
  }
  
  // Check if user has required role
  if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
    // Redirect to dashboard if they don't have permission
    redirect("/organizer/dashboard");
  }

  // Fetch contest data from database
  const contestId = parseInt(params.id);
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      targetGroup: true,
      theme: true
    }
  });

  // If contest not found, redirect to contests list
  if (!contest) {
    redirect('/organizer/contests');
  }

  // Format dates for the form
  const formattedContest = {
    ...contest,
    startDate: contest.startDate.toISOString().split('T')[0],
    endDate: contest.endDate.toISOString().split('T')[0],
    targetGroupIds: contest.targetGroup.map(tg => tg.id),
    themeId: contest.themeId
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Contest</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update details for {contest.name}
          </p>
        </div>
        <Link href={`/organizer/contests/${params.id}/judging-scheme`}>
          <Button className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
            Configure Judging Scheme
          </Button>
        </Link>
      </div>
      
      <ContestForm initialData={formattedContest} />
    </div>
  );
}
