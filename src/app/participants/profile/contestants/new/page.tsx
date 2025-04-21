import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/session';
import prisma from '@/lib/prisma';
import ContestantForm from '@/app/participants/_components/contestant-form';

export const metadata: Metadata = {
  title: 'Add New Contestant | Techlympics 2025',
  description: 'Add a new contestant to your profile',
};

export default async function NewContestantPage() {
  const user = await getCurrentUser();
  
  // Fetch contingents for the current user to allow assigning the contestant to a team
  const contingents = await prisma.contingent.findMany({
    where: {
      userId: Number(user?.id)
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
