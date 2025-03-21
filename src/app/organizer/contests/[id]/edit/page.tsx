import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { ContestForm } from '../../_components/contest-form';

// Mock data for a contest
const getMockContest = (id: string) => ({
  id: parseInt(id),
  name: 'Coding Challenge 2025',
  description: 'A competitive coding challenge to test programming skills across various domains including algorithms, data structures, and problem-solving.',
  category: 'Programming',
  startDate: '2025-04-15',
  endDate: '2025-04-20',
  registrationStartDate: '2025-03-15',
  registrationEndDate: '2025-04-10',
  status: 'Active',
  participants: 145,
  isTeamBased: true,
  minTeamSize: 2,
  maxTeamSize: 4,
  maxParticipants: 200,
  isPublished: true,
  rules: `# Contest Rules

1. All submissions must be original work.
2. Participants must adhere to the code of conduct.
3. Plagiarism will result in immediate disqualification.
4. Teams must have between 2-4 members.
5. All code must be submitted through the platform.
6. Judges' decisions are final.`,
  prizes: `# Prizes

- 1st Place: RM 5,000 and internship opportunities
- 2nd Place: RM 3,000
- 3rd Place: RM 1,500
- Special Category Awards: RM 500 each`,
});

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

  // In a real app, fetch contest data from API/database
  const contest = getMockContest(params.id);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Edit Contest</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update details for {contest.name}
        </p>
      </div>
      
      <ContestForm initialData={contest} />
    </div>
  );
}
