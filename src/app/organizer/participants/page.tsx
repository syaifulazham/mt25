import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, School, Users, BookOpen, Flag, UserRound, AlertCircle, UserPlus, UsersRound, Clock, UserX, UserMinus, BookX, ShieldAlert, ShieldOff, AlertTriangle } from "lucide-react";
import { prismaExecute } from "@/lib/prisma";
import SearchWrapper from "./_components/search-wrapper";

export const metadata: Metadata = {
  title: "Participants | Techlympics 2025",
  description: "Manage all participants in the Techlympics 2025 system",
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function ParticipantsPage() {
  // Get participant data with connection management
  const participantData = await prismaExecute(async (prisma) => {
    // 1. Get last 5 registered participants
    const recentParticipants = await prisma.user_participant.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        contingents: true
      }
    });
    
    // 2. Get participants with no contingents
    const participantsWithoutContingent = await prisma.user_participant.findMany({
      where: {
        contingents: {
          none: {}
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        username: true // Use as fallback for avatar
      }
    });
    
    // 3. Get contingents with no contestants
    const contingentsWithoutContestants = await prisma.contingent.findMany({
      where: {
        contestants: {
          none: {}
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
        schoolId: true,
        higherInstId: true,
        school: {
          select: {
            name: true
          }
        },
        higherInstitution: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            contestants: true
          }
        }
      }
    });
    
    // 4. Get contingents with contestants but no contest assignments (limited to 5 for the dashboard)
    const contingentsWithNoContests = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      createdAt: Date;
      schoolName: string | null;
      higherName: string | null;
      contestantCount: number;
    }>>` 
      SELECT 
        c.id, 
        c.name, 
        c.createdAt,
        s.name as schoolName,
        h.name as higherName,
        COUNT(DISTINCT cont.id) as contestantCount
      FROM contingent c
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution h ON c.higherInstId = h.id
      JOIN contestant cont ON cont.contingentId = c.id
      LEFT JOIN contestParticipation cp ON cp.contestantId = cont.id
      WHERE cp.id IS NULL
      GROUP BY c.id, c.name, c.createdAt, s.name, h.name
      HAVING COUNT(DISTINCT cont.id) > 0
      ORDER BY c.createdAt DESC
      LIMIT 5
    `;

    // 5. Get ALL contingents with contestants but no contest assignments, ordered by contestant count, include manager info
    const allContingentsWithNoContests = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      createdAt: Date;
      schoolName: string | null;
      higherName: string | null;
      contestantCount: number;
      managerName: string | null;
      managerEmail: string | null;
      managerPhone: string | null;
    }>>`
      SELECT 
        c.id, 
        c.name, 
        c.createdAt,
        s.name as schoolName,
        h.name as higherName,
        COUNT(DISTINCT cont.id) as contestantCount,
        up.name as managerName,
        up.email as managerEmail,
        up.phoneNumber as managerPhone
      FROM contingent c
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN higherinstitution h ON c.higherInstId = h.id
      LEFT JOIN contingentManager cm ON cm.contingentId = c.id AND cm.isOwner = true
      LEFT JOIN user_participant up ON up.id = cm.participantId
      JOIN contestant cont ON cont.contingentId = c.id
      LEFT JOIN contestParticipation cp ON cp.contestantId = cont.id
      WHERE cp.id IS NULL
      GROUP BY c.id, c.name, c.createdAt, s.name, h.name, up.name, up.email, up.phoneNumber
      HAVING COUNT(DISTINCT cont.id) > 0
      ORDER BY contestantCount DESC
    `;
    
    return { recentParticipants, participantsWithoutContingent, contingentsWithoutContestants, contingentsWithNoContests, allContingentsWithNoContests };
  });
  
  // Extract data from the prismaExecute result
  const {
    recentParticipants,
    participantsWithoutContingent,
    contingentsWithoutContestants,
    contingentsWithNoContests,
    allContingentsWithNoContests,
  } = participantData;

  // Stats card interface
interface StatsCard {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

// Stats data for dashboard cards
const statsCards: StatsCard[] = [
    {
      title: "All Participants",
      value: "3,214",
      description: "View all registered participants",
      icon: <UserRound className="h-5 w-5 text-purple-600" />,
      href: "/organizer/participants/list"
    },
    {
      title: "Contestants",
      value: "2,456",
      description: "Total registered contestants",
      icon: <Users className="h-5 w-5 text-blue-600" />,
      href: "/organizer/participants/contestants"
    },
    {
      title: "Contingents",
      value: "138",
      description: "Active contingents",
      icon: <UsersRound className="h-5 w-5 text-green-600" />,
      href: "/organizer/contingents"
    },
    {
      title: "Schools",
      value: "75",
      description: "Participating institutions",
      icon: <School className="h-5 w-5 text-amber-600" />,
      href: "/organizer/reference-data"
    }
  ];
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Participant Management" 
        description="Search and manage all participants in the Techlympics system"
      />
      
      {/* Unified search component */}
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl">Search Participants</CardTitle>
          <CardDescription>
            Search for contestants, contingents, schools or teams using name, IC, address or any relevant information
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <SearchWrapper />
        </CardContent>
      </Card>
      
      {/* All Contingents With No Contests Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Contingents with Contestants but No Contests</h2>
        <div className="flex justify-between items-center mb-4">
          <p className="text-muted-foreground">The following contingents have contestants registered but no contests assigned yet.</p>
          
          {allContingentsWithNoContests.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 py-1 px-3 rounded-md flex items-center">
                <span className="text-sm font-semibold text-slate-700 mr-2">Total Contingents:</span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                  {allContingentsWithNoContests.length}
                </Badge>
              </div>
              <div className="bg-slate-100 py-1 px-3 rounded-md flex items-center">
                <span className="text-sm font-semibold text-slate-700 mr-2">Total Contestants:</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                  {allContingentsWithNoContests.reduce((total, contingent) => total + (parseInt(contingent.contestantCount.toString()) || 0), 0).toLocaleString()}
                </Badge>
              </div>
            </div>
          )}
        </div>
        
        {allContingentsWithNoContests.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contingent</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Institution</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Contestants</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {allContingentsWithNoContests.map((contingent) => (
                  <tr key={contingent.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium">{contingent.name}</div>
                          <div className="text-xs text-muted-foreground flex flex-col space-y-1 mt-1">
                            <div className="flex items-center">
                              <span className="font-semibold mr-1">Manager:</span> {contingent.managerName || 'Not assigned'}
                            </div>
                            {contingent.managerEmail && (
                              <div className="flex items-center">
                                <span className="font-semibold mr-1">Email:</span> {contingent.managerEmail}
                              </div>
                            )}
                            {contingent.managerPhone && (
                              <div className="flex items-center">
                                <span className="font-semibold mr-1">Phone:</span> {contingent.managerPhone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{contingent.schoolName || contingent.higherName || "Unknown"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-lg font-bold">{contingent.contestantCount.toLocaleString()}</span>
                        <Badge className="mt-1 bg-amber-500 hover:bg-amber-600 px-2 py-0 text-xs">Need Contests</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-muted-foreground">
                      {format(new Date(contingent.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link href={`/organizer/contingents/${contingent.id}`}>
                        <Button size="sm" variant="outline">View Details</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="py-10">
              <div className="flex flex-col items-center justify-center text-center">
                <BookX className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Contingents Without Contests</h3>
                <p className="text-sm text-muted-foreground">
                  All contingents with contestants have at least one contest assigned.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Section 1: Last 5 registered participants */}
      {recentParticipants.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg font-semibold">Recently Registered Participants</CardTitle>
              </div>
              <Badge variant="outline" className="ml-2">{recentParticipants.length}</Badge>
            </div>
            <CardDescription>The latest participants who have joined the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentParticipants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`/avatars/avatar-${participant.id % 10}.png`} />
                      <AvatarFallback>{participant.name?.substring(0, 2) || participant.username?.substring(0, 2) || "??"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">{participant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.contingents && participant.contingents.length > 0 ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Flag className="h-3 w-3" /> Has Contingent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="h-3 w-3" /> No Contingent
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{format(new Date(participant.createdAt), 'PPP')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/organizer/participants/list" className="text-sm text-primary hover:underline">
                View all participants →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Section 2: Participants without contingents */}
      {participantsWithoutContingent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg font-semibold">Participants Without Contingents</CardTitle>
              </div>
              <Badge variant="outline" className="ml-2">{participantsWithoutContingent.length}</Badge>
            </div>
            <CardDescription>Participants who haven't registered with any school contingent yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {participantsWithoutContingent.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`/avatars/avatar-${participant.id % 10}.png`} />
                      <AvatarFallback>{participant.name?.substring(0, 2) || participant.username?.substring(0, 2) || "??"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">{participant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1 text-amber-600 bg-amber-100">
                      <AlertCircle className="h-3 w-3" /> No Contingent
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{format(new Date(participant.createdAt), 'PPP')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/organizer/participants/list?filter=no-contingent" className="text-sm text-primary hover:underline">
                View all participants without contingents →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Section 3: Contingents without contestants */}
      {contingentsWithoutContestants.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg font-semibold">Contingents Without Contestants</CardTitle>
              </div>
              <Badge variant="outline" className="ml-2">{contingentsWithoutContestants.length}</Badge>
            </div>
            <CardDescription>School contingents that don't have any contestants registered yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contingentsWithoutContestants.map((contingent) => (
                <div key={contingent.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div>
                    <p className="font-medium">{contingent.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contingent.school?.name || contingent.higherInstitution?.name || 'No institution'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1 text-red-600 bg-red-100">
                      <Users className="h-3 w-3" /> No Contestants
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{format(new Date(contingent.createdAt), 'PPP')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/organizer/contingents?filter=no-contestants" className="text-sm text-primary hover:underline">
                View all contingents without contestants →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Section 4: Contingents with contestants but no contests */}
      {contingentsWithNoContests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookX className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg font-semibold">Contingents Without Contest Assignments</CardTitle>
              </div>
              <Badge variant="outline" className="ml-2">{contingentsWithNoContests.length}</Badge>
            </div>
            <CardDescription>Contingents that have contestants but no contests assigned yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contingentsWithNoContests.map((contingent: any) => (
                <div key={contingent.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div>
                    <p className="font-medium">{contingent.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contingent.schoolName || contingent.higherName || 'No institution'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="flex items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
                      <UserRound className="h-3 w-3" /> {contingent.contestantCount} Contestants
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1 text-amber-600 bg-amber-100">
                      <BookOpen className="h-3 w-3" /> No Contests
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/organizer/contingents?filter=no-contests" className="text-sm text-primary hover:underline">
                View all contingents without contest assignments →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
    </div>
  );
}
