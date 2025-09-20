import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/auth-options';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Direct import from API
async function getContestantDetails(id: string) {
  try {
    // Direct API call with relative imports
    const contestant = await prisma.contestant.findUnique({
      where: { id: parseInt(id) },
      include: {
        contingent: {
          include: {
            school: true,
            higherInstitution: true,
            independent: true
          }
        }
      },
    });
    
    if (!contestant) {
      return null;
    }
    
    // Add derived properties for UI display
    return {
      ...contestant,
      contingent: {
        ...contestant.contingent,
        type: getContingentType(contestant.contingent),
        status: 'ACTIVE', // Default status for UI display
        institutionName: getInstitutionName(contestant.contingent)
      }
    };
  } catch (error) {
    console.error('Error fetching contestant details:', error);
    return null;
  }
}

// Helper function to determine contingent type
function getContingentType(contingent: any): string {
  if (contingent.schoolId) return 'SCHOOL';
  if (contingent.higherInstId) return 'HIGHER_INSTITUTION';
  if (contingent.independentId) return 'INDEPENDENT';
  return 'UNKNOWN';
}

// Helper function to get institution name
function getInstitutionName(contingent: any): string {
  if (contingent.school) return contingent.school.name;
  if (contingent.higherInstitution) return contingent.higherInstitution.name;
  if (contingent.independent) return contingent.independent.name || '';
  return '';  
}

// Direct import from database
async function getContestantTeams(id: string) {
  try {
    // Get all teams the contestant is a member of with related event and contest details
    const teams = await prisma.teamMember.findMany({
      where: { 
        contestantId: parseInt(id)
      },
      include: {
        team: {
          include: {
            eventcontestteam: {
              include: {
                eventcontest: {
                  include: {
                    event: true,
                    contest: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Format the response to make it more readable
    const formattedTeams = teams.map(membership => {
      // Extract event contest registrations with more context
      const eventRegistrations = membership.team?.eventcontestteam?.map((ect: any) => ({
        id: ect.id,
        status: ect.status,
        event: ect.eventcontest.event,
        contest: ect.eventcontest.contest
      })) || [];

      return {
        teamMemberId: membership.id,
        role: membership.role,
        team: {
          id: membership.team?.id,
          name: membership.team?.name,
          status: membership.team?.status,
          eventRegistrations
        }
      };
    });
    
    return formattedTeams;
  } catch (error) {
    console.error('Error fetching contestant teams:', error);
    return [];
  }
}

// Direct import from database
async function getContestantContests(id: string) {
  try {
    const contestantId = parseInt(id);
    
    // Method 1: Get contests directly assigned to the contestant
    const directContestParticipation = await prisma.contestParticipation.findMany({
      where: { 
        contestantId 
      },
      include: {
        contest: true
      }
    });

    // Method 2: Get contests the contestant participates in through teams
    const teamContests = await prisma.teamMember.findMany({
      where: { 
        contestantId 
      },
      include: {
        team: {
          include: {
            eventcontestteam: {
              include: {
                eventcontest: {
                  include: {
                    event: true,
                    contest: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Format direct contest participation
    const directContests = directContestParticipation.map((cp: any) => ({
      participationType: 'direct',
      participationId: cp.id,
      contest: cp.contest,
      assignedAt: cp.createdAt || new Date() // Fallback if createdAt is undefined
    }));

    // Format team contest participation
    const teamParticipations: any[] = [];
    teamContests.forEach(membership => {
      if (membership.team?.eventcontestteam) {
        membership.team.eventcontestteam.forEach((ect: any) => {
          teamParticipations.push({
            participationType: 'team',
            participationId: membership.id,
            teamId: membership.team?.id,
            teamName: membership.team?.name,
            contest: ect.eventcontest.contest,
            event: ect.eventcontest.event,
            status: ect.status
          });
        });
      }
    });

    return { directContests, teamParticipations };
  } catch (error) {
    console.error('Error fetching contestant contests:', error);
    return { directContests: [], teamParticipations: [] };
  }
}

export default async function ContestantDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  
  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect('/auth/signin?callbackUrl=/organizer/participants/contestants/' + params.id);
  }
  
  // Check user role
  const userRoles = session.user.role ? [session.user.role] : [];
  if (!userRoles.some(role => ['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'].includes(role))) {
    redirect('/unauthorized');
  }
  
  const contestantData = await getContestantDetails(params.id);
  if (!contestantData) {
    notFound();
  }
  
  const contestantTeams = await getContestantTeams(params.id);
  const contestantContests = await getContestantContests(params.id);
  
  // Helper function to get contingent type name
  const getContingentTypeName = (type: string): string => {
    const types: Record<string, string> = {
      'SCHOOL': 'School',
      'HIGHER_INSTITUTION': 'Higher Institution',
      'INDEPENDENT': 'Independent',
    };
    return types[type] || type;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/organizer/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/organizer/participants">Participants</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Contestant Details</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        
        <a 
          href={`/organizer/contingents/${contestantData.contingentId}`} 
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Contingent
        </a>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contestant Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contestant Information</CardTitle>
            <CardDescription>Personal details and information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1 text-lg font-semibold">{contestantData.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">IC Number</h3>
                <p className="mt-1">{contestantData.ic}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                <p className="mt-1">{contestantData.gender}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Education Level</h3>
                <p className="mt-1">{contestantData.edu_level || 'Not specified'}</p>
              </div>
              
              {contestantData.class_grade && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Grade/Year</h3>
                  <p className="mt-1">{contestantData.class_grade}</p>
                </div>
              )}
              
              {contestantData.class_name && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Class</h3>
                  <p className="mt-1">{contestantData.class_name}</p>
                </div>
              )}
              
              {contestantData.email && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1">{contestantData.email}</p>
                </div>
              )}
              
              {/* Phone field - only shown if present */
               contestantData?.phoneNumber && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="mt-1">{contestantData.phoneNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Contingent Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contingent Information</CardTitle>
            <CardDescription>Details about the contestant's contingent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contingent Name</h3>
                <p className="mt-1 text-lg font-semibold">{contestantData.contingent.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Type</h3>
                <Badge variant="outline" className="mt-1">
                  {getContingentTypeName(contestantData.contingent.type)}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <Badge 
                  className="mt-1"
                  variant={contestantData.contingent.status === 'ACTIVE' ? 'default' : 'secondary'}
                >
                  {contestantData.contingent.status}
                </Badge>
              </div>
              
              {contestantData.contingent.institutionName && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Institution</h3>
                  <p className="mt-1">{contestantData.contingent.institutionName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participation Information */}
      <div className="mt-8">
        <Tabs defaultValue="teams" className="w-full">
          <TabsList>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="contests">Contests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Team Memberships</h2>
            {contestantTeams.length === 0 ? (
              <p className="text-gray-500">This contestant is not a member of any teams.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {contestantTeams.map((membership: any, index: number) => (
                  <Card key={index} className="border-green-500 bg-green-50">
                    <CardHeader className="pb-2 bg-green-100 border-b border-green-200">
                      <CardTitle className="text-green-800">{membership.team.name}</CardTitle>
                      <CardDescription>
                        Role: <span className="font-medium text-green-700">{membership.role || 'Member'}</span> | 
                        Status: <Badge variant={membership.team.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {membership.team.status}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="bg-green-50">
                      <h3 className="text-sm font-medium mb-2">Event Registrations</h3>
                      {membership.team.eventRegistrations.length === 0 ? (
                        <p className="text-xs text-gray-500">No event registrations found.</p>
                      ) : (
                        <ul className="space-y-2">
                          {membership.team.eventRegistrations.map((registration: any, regIndex: number) => (
                            <li key={regIndex} className="text-sm">
                              <div className="font-medium">{registration.event.name}</div>
                              <div className="text-xs text-gray-600">
                                Contest: {registration.contest.name}
                              </div>
                              <Badge 
                                variant={
                                  registration.status === 'APPROVED' || registration.status === 'ACCEPTED' ? 'default' :
                                  registration.status === 'PENDING' ? 'outline' : 'secondary'
                                }
                                className="mt-1 text-xs"
                              >
                                {registration.status}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="contests" className="mt-6">
            <div className="space-y-8">
              {/* Direct Contest Participation */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Individual Contest Participation</h2>
                {contestantContests.directContests.length === 0 ? (
                  <p className="text-gray-500">This contestant is not directly participating in any contests.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {contestantContests.directContests.map((participation: any, index: number) => (
                      <Card key={index} className="border-pink-500 bg-pink-50">
                        <CardHeader className="pb-2 bg-pink-100 border-b border-pink-200">
                          <CardTitle className="text-pink-800">{participation.contest.name}</CardTitle>
                          <CardDescription className="text-pink-600">Direct Participation</CardDescription>
                        </CardHeader>
                        <CardContent className="bg-pink-50">
                          <div className="text-sm">
                            <div>
                              <span className="font-medium">Category:</span> {participation.contest.category}
                            </div>
                            <div className="mt-1">
                              <span className="font-medium">Assigned at:</span> {new Date(participation.assignedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Team Contest Participation */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Team Contest Participation</h2>
                {contestantContests.teamParticipations.length === 0 ? (
                  <p className="text-gray-500">This contestant is not participating in any contests through teams.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {contestantContests.teamParticipations.map((participation: any, index: number) => (
                      <Card key={index} className="border-green-500 bg-green-50">
                        <CardHeader className="pb-2 bg-green-100 border-b border-green-200">
                          <CardTitle className="text-green-800">{participation.contest.name}</CardTitle>
                          <CardDescription>
                            Via team: <span className="font-medium text-green-700">{participation.teamName}</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="bg-green-50">
                          <div className="text-sm">
                            <div>
                              <span className="font-medium">Event:</span> {participation.event.name}
                            </div>
                            <div className="mt-1">
                              <span className="font-medium">Category:</span> {participation.contest.category}
                            </div>
                            <div className="mt-1">
                              <span className="font-medium">Status:</span>{' '}
                              <Badge 
                                variant={
                                  participation.status === 'APPROVED' || participation.status === 'ACCEPTED' ? 'default' :
                                  participation.status === 'PENDING' ? 'outline' : 'secondary'
                                }
                              >
                                {participation.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
