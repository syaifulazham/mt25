import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, UsersIcon, TrophyIcon, BookOpenIcon, EditIcon, ArrowLeftIcon, TagIcon } from 'lucide-react';
import { contestApi } from '@/lib/api-client';

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
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'Upcoming':
      return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
    case 'Completed':
      return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
    case 'Cancelled':
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-100">{status}</Badge>;
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

  // Fetch contest data from API
  let contest;
  try {
    contest = await contestApi.getContest(parseInt(params.id));
  } catch (error) {
    console.error('Error fetching contest:', error);
    // If contest not found, redirect to contests page
    redirect('/organizer/contests');
  }

  // Determine contest status based on dates
  const now = new Date();
  const startDate = new Date(contest.startDate);
  const endDate = new Date(contest.endDate);
  
  let status = 'Draft';
  if (now < startDate) {
    status = 'Upcoming';
  } else if (now >= startDate && now <= endDate) {
    status = 'Active';
  } else if (now > endDate) {
    status = 'Completed';
  }

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
                <Badge variant="outline">{contest.contestType}</Badge>
                {getStatusBadge(status)}
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
        
        {/* Contest details tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="prizes">Prizes</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contest Code</h3>
                    <p>{contest.code}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                    <p className="whitespace-pre-wrap">{contest.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contest Type</h3>
                    <p>{contest.contestType}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contest Method</h3>
                    <p>{contest.method}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Judging Method</h3>
                    <p>{contest.judgingMethod}</p>
                  </div>

                  {contest.theme && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Theme</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <TagIcon className="h-4 w-4" style={{ color: contest.theme.color || '#888888' }} />
                        <span>{contest.theme.name}</span>
                      </div>
                      {contest.theme.description && (
                        <p className="text-sm text-muted-foreground mt-1">{contest.theme.description}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Dates and Participation */}
              <Card>
                <CardHeader>
                  <CardTitle>Dates & Participation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Contest Period</h3>
                      <p>{formatDate(contest.startDate)} - {formatDate(contest.endDate)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Target Groups</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contest.targetGroup && contest.targetGroup.map((group: any) => (
                          <Badge key={group.id} variant="outline">{group.name}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Accessibility</h3>
                    <p>{contest.accessibility ? 'Public' : 'Private'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Contest Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {contest.rules ? (
                    <div className="whitespace-pre-wrap">{contest.rules}</div>
                  ) : (
                    <p className="text-muted-foreground">No rules have been specified for this contest.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Prizes Tab */}
          <TabsContent value="prizes">
            <Card>
              <CardHeader>
                <CardTitle>Prizes & Awards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {contest.prizes ? (
                    <div className="whitespace-pre-wrap">{contest.prizes}</div>
                  ) : (
                    <p className="text-muted-foreground">No prizes have been specified for this contest.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>
                  Manage contest participants and teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Participant management will be implemented in a future update.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Submissions</CardTitle>
                <CardDescription>
                  View and evaluate contest submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Submission management will be implemented in a future update.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
