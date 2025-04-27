import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/session';
import prisma from '@/lib/prisma';
import ContestantForm from '@/app/participants/_components/contestant-form';
import { redirect } from 'next/navigation';

// Mark this page as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Add New Contestant | Techlympics 2025',
  description: 'Add a new contestant to your profile',
};

export default async function NewContestantPage() {
  const user = await getCurrentUser();
  
  // Redirect if not authenticated
  if (!user) {
    redirect('/login');
  }
  
  // Fetch contingents managed by the current user to allow assigning the contestant to a team
  const managedContingents = await prisma.contingentManager.findMany({
    where: {
      participantId: Number(user.id) // Now safe since we check user exists
    },
    select: {
      contingentId: true
    }
  });

  const contingentIds = managedContingents.map(cm => cm.contingentId);

  // Fetch the full contingent details
  const contingents = await prisma.contingent.findMany({
    where: {
      id: {
        in: contingentIds.length > 0 ? contingentIds : [-1] // Use -1 if no contingents (will find nothing)
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Contestant</h1>
        <p className="text-muted-foreground">
          Register a new contestant with your required information
        </p>
      </div>
      
      <ContestantForm contingents={contingents} />
    </div>
  );
}
