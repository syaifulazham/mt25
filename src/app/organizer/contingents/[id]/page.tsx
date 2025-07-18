import React from "react";
import { Metadata } from "next";
import { FaEnvelope } from "react-icons/fa";
import { MdOutlineContactSupport } from "react-icons/md";
import { ImDatabase } from "react-icons/im";
import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  CalendarIcon,
  Clock,
  Edit,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  School,
  ShieldAlert,
  Trash2,
  UserCog,
  UserRound,
  Users,
  UserX
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StateFormatter } from "../_components/state-formatter";
import { ContingentDetailTabs } from "../_components/contingent-detail-tabs";
import { PrimaryManagerWrapper } from "../_components/primary-manager-wrapper";
import { AdminPrimaryManagerChanger } from "../_components/admin-primary-manager-changer";
import { DirectAdminChanger } from "../_components/direct-admin-changer";
import { ForcePrimaryManagerChanger } from "../_components/force-primary-manager-changer";
import { EmergencyPrimaryManagerForm } from "../_components/emergency-primary-manager-form";
import BulkAssignContestsButton from "../../participants/_components/bulk-assign-contests-button";
import { prismaExecute } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

type PageProps = {
  params: {
    id: string;
  };
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// This function generates the page metadata dynamically based on the contingent name
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseInt(params.id);
  
  if (isNaN(id)) {
    return {
      title: "Contingent Not Found | Techlympics 2025",
    };
  }
  
  // Fetch contingent name to use in the title with proper connection management
  try {
    const contingent = await prismaExecute(prisma => 
      prisma.contingent.findUnique({
        where: { id },
        select: { name: true }
      })
    );
    
    if (!contingent) {
      return {
        title: "Contingent Not Found | Techlympics 2025",
      };
    }
    
    return {
      title: `${contingent.name} | Contingent Details | Techlympics 2025`,
      description: `Details for contingent ${contingent.name} including contestants, teams, and statistics`
    };
  } catch (error) {
    return {
      title: "Contingent Details | Techlympics 2025",
    };
  }
}

// Define State Object interface for type safety
interface StateObject {
  name: string;
  id: number;
  zoneId: number;
}
// Define detailed contingent type to match Prisma schema
interface ContingentWithDetails {
  id: number;
  name: string;
  short_name: string | null;
  logoUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  participantId: number | null;
  managedByParticipant: boolean;
  schoolId: number | null;
  higherInstId: number | null;
  school?: {
    id: number;
    name: string;
    state: string | StateObject;
    ppd: string | null;
    address: string | null;
    category: string | null;
  } | null;
  higherInstitution?: {
    id: number;
    name: string;
    state: string | StateObject;
    address: string | null;
  } | null;
  managers: Array<{
    id: number;
    isOwner: boolean;
    createdAt: Date;
    participant: {
      id: number;
      name: string;
      email: string;
    };
  }>;
  contestants: Array<{
    id: number;
    name: string;
    gender: string | null;
    ic: string | null;
    phoneNumber: string | null;
    email: string | null;
    edu_level: string;
    class_grade: string | null;
    class_name: string | null;
    contests: Array<{
      id: number;
      contest: {
        id: number;
        name: string;
        startDate?: Date;
        endDate?: Date;
      };
    }>;
  }>;
  teams: Array<{
    id: number;
    name: string;
    hashcode: string;
    description: string | null;
    status: string;
    createdAt: Date;
    contest: {
      id: number;
      name: string;
    };
    _count: {
      members: number;
    };
  }>;
  _count: {
    contestants: number;
    teams: number;
  };
}



export default async function ContingentDetailPage({ params }: PageProps) {
  const id = parseInt(params.id);
  
  if (isNaN(id)) {
    notFound();
  }
  
  try {
    // Get the session using Next Auth (same pattern as other organizer pages)
    const session = await getServerSession(authOptions);
    
    // If not authenticated, redirect to login
    if (!session || !session.user) {
      redirect("/auth/organizer/login?redirect=/organizer/contingents/" + id);
    }

    // Get user from session
    const currentUser = session.user;
    const isAdmin = currentUser?.role === 'ADMIN';
    const adminEmail = isAdmin ? currentUser.email : null;
    
    // Fetch contingent details with all related information using prismaExecute for connection management
    // The query structure matches the actual Prisma schema
    const contingent = await prismaExecute(prisma => prisma.contingent.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            state: true,
            ppd: true,
            address: true,
            category: true
          }
        },
        higherInstitution: {
          select: {
            id: true,
            name: true,
            state: true,
            address: true,
          }
        },
        contestants: {
          select: {
            id: true,
            name: true,
            gender: true,
            ic: true,
            phoneNumber: true,
            email: true,
            edu_level: true,
            class_grade: true,
            class_name: true,
            is_ppki: true,
            contests: {
              select: {
                id: true,
                contest: {
                  select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true
                  }
                }
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        },
        managers: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        teams: {
          select: {
            id: true,
            name: true,
            hashcode: true,
            description: true,
            status: true,
            createdAt: true,
            evidence_doc: true,
            contest: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                members: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            contestants: true,
            teams: true
          }
        }
      }
    }));
    
    if (!contingent) {
      notFound();
    }

    // Count contestants without any contest assignments for this specific contingent
    const contestantsWithoutContests = await prismaExecute(async (prisma) => {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM contestant cont
        LEFT JOIN contestParticipation cp ON cp.contestantId = cont.id
        WHERE cont.contingentId = ${id} AND cp.id IS NULL
      `;
      return Number(result[0]?.count || 0);
    });

    // Get pagination from searchParams or use defaults
    const pageSize = 5; // Number of items per page

    // Cast to our detailed type
    const contingentWithDetails = contingent as unknown as ContingentWithDetails;
    // Calculate contest participation statistics
    const contestStats = {
      uniqueContests: 0,  // Number of different contests
      totalParticipations: 0,  // Total number of contestant-contest assignments
      upcomingContests: 0,
      completedContests: 0
    };

    // Track unique contests using a Set
    const uniqueContests = new Set<number>();
    const now = new Date();
    
    // Calculate contest statistics by iterating through each contestant's contests
    contingentWithDetails.contestants.forEach(contestant => {
      // Add this contestant's participation count to the total
      contestStats.totalParticipations += contestant.contests.length;
      
      contestant.contests.forEach(participation => {
        // Add to the set of unique contest IDs
        uniqueContests.add(participation.contest.id);
        
        // If contest has start/end dates, use them for statistics
        if (participation.contest.startDate && participation.contest.endDate) {
          const startDate = new Date(participation.contest.startDate);
          const endDate = new Date(participation.contest.endDate);
          
          if (endDate < now) {
            contestStats.completedContests++;
          } else if (startDate > now) {
            contestStats.upcomingContests++;
          }
        }
      });
    });
    
    // Set the count of unique contests
    contestStats.uniqueContests = uniqueContests.size;

    // Get the institution details - either school or higher institution
    const institution = contingentWithDetails.school || contingentWithDetails.higherInstitution;
    const isSchool = !!contingentWithDetails.school;
    
    return (
      <div className="container mx-auto py-6 space-y-8">
        {/* Back button and header */}
        <div className="space-y-4">
          <Link 
            href="/organizer/contingents" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Contingents
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <PageHeader 
              title={contingentWithDetails.name}
              description={institution?.name || "No institution"}
            />
            {institution?.state && (
              <div className="-mt-2 text-muted-foreground">
                <StateFormatter state={institution.state} />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-1" size="sm">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Contingent details */}
          <div className="space-y-6">
            {/* Contingent info card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {isSchool ? (
                    <School className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Building2 className="h-5 w-5 text-purple-500" />
                  )}
                  {isSchool ? 'School Contingent' : 'Higher Institution Contingent'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Contingent Name</div>
                  <div>{contingentWithDetails.name}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">{isSchool ? 'School' : 'Institution'}</div>
                  <div>{institution?.name || "No institution"}</div>
                </div>
                {institution?.state && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">State</div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {typeof institution.state === 'object' 
                          ? (institution.state as StateObject).name 
                          : institution.state}
                      </span>
                    </div>
                  </div>
                )}

                {isSchool && contingentWithDetails.school?.ppd && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">PPD</div>
                    <div className="flex items-center gap-1.5">
                      <div>{contingentWithDetails.school.ppd}</div>
                    </div>
                  </div>
                )}

                {isSchool && contingentWithDetails.school?.category && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Category</div>
                    <div className="flex items-center gap-1.5">
                      <div>{contingentWithDetails.school.category}</div>
                    </div>
                  </div>
                )}

                {institution?.address && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Address</div>
                    <div className="text-sm">{institution.address}</div>
                  </div>
                )}

                {/* Display contact info from contestant manager if available */}
                {contingentWithDetails.contestants[0]?.phoneNumber && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contingentWithDetails.contestants[0].phoneNumber}</span>
                  </div>
                )}

                {contingentWithDetails.contestants[0]?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{contingentWithDetails.contestants[0].email}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Created on {format(new Date(contingentWithDetails.createdAt), 'PPP')}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {/* Statistics cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Users className="h-8 w-8 text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{contingentWithDetails._count.contestants}</div>
                    <p className="text-sm text-muted-foreground">Contestants</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Award className="h-8 w-8 text-amber-500 mb-2" />
                    <div className="text-2xl font-bold">{contestStats.uniqueContests}</div>
                    <p className="text-sm text-muted-foreground">Contests</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Contestants without contests card */}
            {contestantsWithoutContests > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserX className="h-5 w-5 text-orange-600" />
                    Contestants Without Contests
                  </CardTitle>
                  <CardDescription>
                    {contestantsWithoutContests} contestant{contestantsWithoutContests !== 1 ? 's' : ''} haven't been assigned to any contest yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center">
                      <div className="text-3xl font-bold text-orange-600 mb-1">
                        {contestantsWithoutContests}
                      </div>
                      <span className="text-sm text-gray-600">
                        Need Assignment
                      </span>
                    </div>
                    {isAdmin ? (
                      <BulkAssignContestsButton 
                        contingentId={contingentWithDetails.id}
                        contingentName={contingentWithDetails.name}
                        contestantCount={contestantsWithoutContests}
                      />
                    ) : (
                      <div className="text-sm text-gray-500">Admin access required</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Show when no contestants without contests */}
            {contestantsWithoutContests === 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600" />
                    All Contestants Assigned
                  </CardTitle>
                  <CardDescription>
                    All contestants in this contingent have been assigned to contests.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            
            {/* Contest statistics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Contest Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {contestStats.totalParticipations}
                    </div>
                    <span className="text-sm text-gray-500">
                      Total Participations
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Contingent Managers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contingent Management</CardTitle>
                
                {/* Management Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-3 w-full">
                  {/* Show Change Primary Manager button for all users */}
                  {contingentWithDetails.managers.length > 1 && (
                    <div className="[&>button]:bg-black [&>button]:hover:bg-gray-800 [&>button]:text-white [&>button]:border-black [&>button]:text-xs [&>button]:px-3 [&>button]:py-1 flex-shrink-0">
                      <PrimaryManagerWrapper 
                        contingentId={contingentWithDetails.id}
                        managers={contingentWithDetails.managers}
                      />
                    </div>
                  )}
                  
                  {/* Admin Actions Modal - Only for admins */}
                  {isAdmin && contingentWithDetails.managers.length > 1 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs px-2 py-1 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Advanced Management Actions</DialogTitle>
                          <DialogDescription>
                            Additional management options for this contingent.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Force change primary manager - NO AUTH CHECKS */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Force Change Primary Manager</h4>
                            <div className="[&>button]:bg-red-600 [&>button]:hover:bg-red-700 [&>button]:text-white [&>button]:border-red-500">
                              <ForcePrimaryManagerChanger 
                                contingentId={contingentWithDetails.id}
                                managers={contingentWithDetails.managers}
                              />
                            </div>
                          </div>

                          {/* Direct admin override component */}
                          {adminEmail && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Direct Admin Override</h4>
                              <div className="[&>button]:bg-orange-600 [&>button]:hover:bg-orange-700 [&>button]:text-white [&>button]:border-orange-500">
                                <DirectAdminChanger 
                                  contingentId={contingentWithDetails.id}
                                  managers={contingentWithDetails.managers}
                                  adminEmail={adminEmail}
                                />
                              </div>
                            </div>
                          )}

                          {/* Standard admin component */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Admin Manager Changer</h4>
                            <div className="[&>button]:bg-blue-600 [&>button]:hover:bg-blue-700 [&>button]:text-white [&>button]:border-blue-500">
                              <AdminPrimaryManagerChanger 
                                contingentId={contingentWithDetails.id}
                                managers={contingentWithDetails.managers}
                              />
                            </div>
                          </div>

                          {/* Emergency Tools */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Emergency Tools</h4>
                            <Link href={`/emergency-tools`}>
                              <Button variant="outline" size="sm" className="text-xs bg-red-600 hover:bg-red-700 text-white border-red-500 w-full">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Emergency Tools
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Primary Manager */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">Primary Manager</div>
                  {
                    contingentWithDetails.managers.filter(manager => manager.isOwner).length > 0 ? (
                      contingentWithDetails.managers
                        .filter(manager => manager.isOwner)
                        .map(manager => {
                          const initials = manager.participant.name
                            .split(' ')
                            .map(part => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                            
                          return (
                            <div key={manager.id} className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {manager.participant.name} 
                                  <Badge variant="outline" className="ml-1 text-xs bg-amber-50 text-amber-700">Primary</Badge>
                                </span>
                                <span className="text-xs text-muted-foreground">{manager.participant.email}</span>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-sm text-gray-500 italic">No primary manager assigned</div>
                    )
                  }
                </div>
                
                {/* Co-Managers */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">Co-Managers</div>
                  {contingentWithDetails.managers.filter(manager => !manager.isOwner).length > 0 ? (
                    <div className="space-y-2">
                      {contingentWithDetails.managers
                        .filter(manager => !manager.isOwner)
                        .map(manager => {
                          const initials = manager.participant.name
                            .split(' ')
                            .map(part => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                            
                          return (
                            <div key={manager.id} className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm">{manager.participant.name}</span>
                                <span className="text-xs text-muted-foreground">{manager.participant.email}</span>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">No co-managers assigned</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right column - Contestants and Teams */}
          <ContingentDetailTabs contingentData={contingentWithDetails} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching contingent:", error);
    notFound();
  }
}
