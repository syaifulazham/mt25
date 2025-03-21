import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { ContestForm } from '../_components/contest-form';

export default async function NewContestPage() {
  const user = await getCurrentUser();
  
  // Check if user is authenticated
  if (!user) {
    redirect("/organizer/auth/login?redirect=/organizer/contests/new");
  }
  
  // Check if user has required role
  if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
    // Redirect to dashboard if they don't have permission
    redirect("/organizer/dashboard");
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Create New Contest</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new contest to the Techlympics platform
        </p>
      </div>
      
      <ContestForm />
    </div>
  );
}
