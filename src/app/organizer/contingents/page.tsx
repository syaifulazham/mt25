import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CalendarIcon, 
  School, 
  Users, 
  BookOpen, 
  Flag, 
  UserRound, 
  AlertCircle, 
  Plus,
  Search,
  Filter,
  Shield,
  Building,
  ShieldCheck,
  ShieldAlert,
  Building2
} from "lucide-react";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StateFormatter } from "./_components/state-formatter";

export const metadata: Metadata = {
  title: "Contingents | Techlympics 2025",
  description: "Manage all contingents in the Techlympics 2025 system",
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define interfaces for our data types to help TypeScript
interface StateObject {
  name: string;
  id: number;
  zoneId: number;
}

interface ContingentData {
  id: number;
  name: string;
  createdAt: Date;
  schoolId: number | null;
  higherInstId: number | null;
  school?: {
    name: string;
    state: string;
  } | null;
  higherInstitution?: {
    name: string;
    state: string;
  } | null;
  contestants: Array<{
    id: number;
    name: string;
    gender: string | null;
  }>;
  _count: {
    contestants: number;
  };
}

export default async function ContingentsPage() {
  // Get all contingents with details in a single query
  const contingentsWithDetails = await prisma.contingent.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    include: {
      school: {
        select: {
          name: true,
          state: true
        }
      },
      higherInstitution: {
        select: {
          name: true,
          state: true
        }
      },
      contestants: {
        select: {
          id: true,
          name: true,
          gender: true
        },
        take: 6 // Get one more than we need for the +X display
      },
      _count: {
        select: {
          contestants: true
        }
      }
    }
  }) as unknown as ContingentData[];

  // Get contingents without contestants
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
    include: {
      school: {
        select: {
          name: true,
          state: true
        }
      },
      higherInstitution: {
        select: {
          name: true,
          state: true
        }
      },
      _count: {
        select: {
          contestants: true
        }
      }
    }
  });

  // Get school-based contingents
  const schoolContingents = await prisma.contingent.findMany({
    where: {
      schoolId: {
        not: null
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    include: {
      school: {
        select: {
          name: true,
          state: true
        }
      },
      _count: {
        select: {
          contestants: true
        }
      }
    }
  });

  // Get higher institution contingents
  const higherInstContingents = await prisma.contingent.findMany({
    where: {
      higherInstId: {
        not: null
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    include: {
      higherInstitution: {
        select: {
          name: true,
          state: true
        }
      },
      _count: {
        select: {
          contestants: true
        }
      }
    }
  });

  // Format state names for display
  const formatStateName = (stateName: string | StateObject | null | undefined): string => {
    if (!stateName) return '';
    
    // If it's an object, extract the name property
    if (typeof stateName === 'object') {
      const stateObj = stateName as StateObject;
      return stateObj.name ? formatStateName(stateObj.name) : '';
    }
    
    const stateStr = String(stateName);
    const upperStateName = stateStr.toUpperCase();
    
    if (upperStateName.includes('NEGERI SEMBILAN')) return 'N9';
    if (upperStateName.includes('PULAU PINANG')) return 'P. PINANG';
    if (upperStateName.includes('WILAYAH PERSEKUTUAN KUALA LUMPUR')) return 'WP KL';
    if (upperStateName.includes('WILAYAH PERSEKUTUAN')) {
      return `WP ${upperStateName.replace('WILAYAH PERSEKUTUAN', '').trim()}`;
    }
    if (upperStateName.includes('KUALA LUMPUR')) return 'KL';
    
    return stateStr;
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Contingent Management" 
        description="Search and manage all contingents in the Techlympics system"
      />
      
      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search contingents by name, school, or location..." 
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            New Contingent
          </Button>
        </div>
      </div>
      
      {/* Contingent type tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Contingents</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="higher">Higher Institutions</TabsTrigger>
          <TabsTrigger value="no-contestants">No Contestants</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {contingentsWithDetails.map((contingent) => (
              <Card key={contingent.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{contingent.name}</CardTitle>
                      <CardDescription>
                        {contingent.school?.name || contingent.higherInstitution?.name || 'No institution'}
                        {((contingent.school?.state && typeof contingent.school.state === 'string') || (contingent.higherInstitution?.state && typeof contingent.higherInstitution.state === 'string')) && (
                          <span className="ml-1 text-xs">
                            ({formatStateName(contingent.school?.state || contingent.higherInstitution?.state || '')})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge className="flex items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
                      <Users className="h-3.5 w-3.5" /> {contingent._count.contestants}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5 -space-x-2">
                      {contingent.contestants.slice(0, 5).map((contestant: any, i: number) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-white">
                          <AvatarFallback className="text-[10px]">{contestant.name?.substring(0, 2) || "?"}</AvatarFallback>
                        </Avatar>
                      ))}
                      {contingent._count.contestants > 5 && (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                          +{contingent._count.contestants - 5}
                        </div>
                      )}
                    </div>
                    <Link 
                      href={`/organizer/contingents/${contingent.id}`} 
                      className="text-xs text-primary hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-6">
            <Button variant="outline">Load More Contingents</Button>
          </div>
        </TabsContent>
        
        <TabsContent value="schools" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {schoolContingents.map((contingent) => (
              <Card key={contingent.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <School className="h-4 w-4 text-amber-500" />
                        <CardTitle className="text-base">{contingent.name}</CardTitle>
                      </div>
                      <CardDescription>
                        {contingent.school?.name || 'Unknown School'}
                        <StateFormatter state={contingent.school?.state} />
                      </CardDescription>
                    </div>
                    <Badge className="flex items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
                      <Users className="h-3.5 w-3.5" /> {contingent._count.contestants}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{format(new Date(contingent.createdAt), 'PPP')}</span>
                    </div>
                    <Link 
                      href={`/organizer/contingents/${contingent.id}`} 
                      className="text-xs text-primary hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {schoolContingents.length > 0 && (
            <div className="text-center mt-6">
              <Button variant="outline">View All School Contingents</Button>
            </div>
          )}
          {schoolContingents.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <School className="h-8 w-8 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No School Contingents Found</h3>
                <p className="text-muted-foreground">There are no school contingents registered yet.</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-1" /> Create School Contingent
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="higher" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {higherInstContingents.map((contingent) => (
              <Card key={contingent.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Building2 className="h-4 w-4 text-purple-500" />
                        <CardTitle className="text-base">{contingent.name}</CardTitle>
                      </div>
                      <CardDescription>
                        {contingent.higherInstitution?.name || 'Unknown Institution'}
                        <StateFormatter state={contingent.higherInstitution?.state} />
                      </CardDescription>
                    </div>
                    <Badge className="flex items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
                      <Users className="h-3.5 w-3.5" /> {contingent._count.contestants}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{format(new Date(contingent.createdAt), 'PPP')}</span>
                    </div>
                    <Link 
                      href={`/organizer/contingents/${contingent.id}`} 
                      className="text-xs text-primary hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {higherInstContingents.length > 0 && (
            <div className="text-center mt-6">
              <Button variant="outline">View All Higher Institution Contingents</Button>
            </div>
          )}
          {higherInstContingents.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No Higher Institution Contingents Found</h3>
                <p className="text-muted-foreground">There are no higher institution contingents registered yet.</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-1" /> Create Higher Institution Contingent
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="no-contestants" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {contingentsWithoutContestants.map((contingent) => (
              <Card key={contingent.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        <CardTitle className="text-base">{contingent.name}</CardTitle>
                      </div>
                      <CardDescription>
                        {contingent.school?.name || contingent.higherInstitution?.name || 'No institution'}
                        {((contingent.school?.state && typeof contingent.school.state === 'string') || (contingent.higherInstitution?.state && typeof contingent.higherInstitution.state === 'string')) && (
                          <span className="ml-1 text-xs">
                            ({formatStateName(contingent.school?.state || contingent.higherInstitution?.state || '')})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1 text-red-600 bg-red-100">
                      <AlertCircle className="h-3.5 w-3.5" /> No Contestants
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{format(new Date(contingent.createdAt), 'PPP')}</span>
                    </div>
                    <Link 
                      href={`/organizer/contingents/${contingent.id}`} 
                      className="text-xs text-primary hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {contingentsWithoutContestants.length > 0 && (
            <div className="text-center mt-6">
              <Button variant="outline">View All Empty Contingents</Button>
            </div>
          )}
          {contingentsWithoutContestants.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-green-500" />
                <h3 className="text-lg font-semibold">No Empty Contingents Found</h3>
                <p className="text-muted-foreground">All contingents have contestants assigned to them.</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
