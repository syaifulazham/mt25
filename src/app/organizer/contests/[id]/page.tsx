import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, UsersIcon, TrophyIcon, BookOpenIcon, EditIcon, ArrowLeftIcon } from 'lucide-react';

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

// Helper function to format dates
function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(dateString).toLocaleDateString('en-MY', options);
}

// Helper function to get status badge
function getStatusBadge(status: string) {
  switch (status) {
    case 'Active':
      return <Badge className="bg-green-500">Active</Badge>;
    case 'Upcoming':
      return <Badge className="bg-blue-500">Upcoming</Badge>;
    case 'Completed':
      return <Badge className="bg-gray-500">Completed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default async function ContestDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  
  // Check if user is authenticated
  if (!user) {
    redirect(`/organizer/auth/login?redirect=/organizer/contests/${params.id}`);
  }
  
  // Check if user has required role
  if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR', 'VIEWER'])) {
    // Redirect to dashboard if they don't have permission
    redirect("/organizer/dashboard");
  }

  // In a real app, fetch contest data from API/database
  const contest = getMockContest(params.id);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        {/* Header with back button and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/organizer/contests">
              <Button variant="outline" size="icon">
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{contest.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{contest.category}</Badge>
                {getStatusBadge(contest.status)}
                {contest.isPublished ? (
                  <Badge variant="outline" className="bg-green-100">Published</Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-100">Draft</Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {hasRequiredRole(user, ['ADMIN', 'OPERATOR']) && (
              <Link href={`/organizer/contests/${params.id}/edit`}>
                <Button className="flex items-center gap-2">
                  <EditIcon className="h-4 w-4" />
                  Edit Contest
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        {/* Contest overview cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Contest Dates */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Contest Period</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatDate(contest.startDate)} - {formatDate(contest.endDate)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Duration: {Math.ceil((new Date(contest.endDate).getTime() - new Date(contest.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </CardContent>
          </Card>
          
          {/* Registration Dates */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Registration Period</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatDate(contest.registrationStartDate)} - {formatDate(contest.registrationEndDate)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Duration: {Math.ceil((new Date(contest.registrationEndDate).getTime() - new Date(contest.registrationStartDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </CardContent>
          </Card>
          
          {/* Participants */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Participants</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {contest.participants} / {contest.maxParticipants || '∞'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {contest.isTeamBased 
                  ? `Team-based (${contest.minTeamSize}-${contest.maxTeamSize} members)` 
                  : 'Individual participants'}
              </p>
            </CardContent>
          </Card>
          
          {/* Status */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrophyIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {contest.status}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {contest.status === 'Active' 
                  ? 'Contest is currently running' 
                  : contest.status === 'Upcoming' 
                    ? 'Contest has not started yet' 
                    : 'Contest has ended'}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="prizes">Prizes</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Contest Description</CardTitle>
                <CardDescription>
                  Detailed information about this contest
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p>{contest.description}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Contest Rules</CardTitle>
                <CardDescription>
                  Rules and guidelines for participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap">{contest.rules}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Prizes Tab */}
          <TabsContent value="prizes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Prizes and Awards</CardTitle>
                <CardDescription>
                  Rewards for winners and participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap">{contest.prizes}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Participants Tab */}
          <TabsContent value="participants" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Registered Participants</CardTitle>
                <CardDescription>
                  {contest.participants} participants registered for this contest
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This is a placeholder for the participants list. In a real application, this would display a table of registered participants or teams.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Submissions Tab */}
          <TabsContent value="submissions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Contest Submissions</CardTitle>
                <CardDescription>
                  Submissions from participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This is a placeholder for the submissions list. In a real application, this would display a table of participant submissions with their status and scores.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
