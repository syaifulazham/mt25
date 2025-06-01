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
  Building2,
  LayoutGrid,
  Table as TableIcon
} from "lucide-react";
import { prismaExecute } from "@/lib/prisma";
import { Button, buttonVariants } from "@/components/ui/button";
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

export default async function ContingentsPage({ searchParams }: { searchParams: { page?: string, search?: string, view?: string } }) {
  // Get the current page from the query params or default to 1
  const currentPage = parseInt(searchParams.page || '1', 10);
  const pageSize = 12; // Number of contingents per page
  const skip = (currentPage - 1) * pageSize;
  const searchTerm = searchParams.search || '';
  const viewMode = searchParams.view === 'table' ? 'table' : 'card'; // Default to card view
  
  // Use prismaExecute to get contingent data with pagination and proper connection management
  const { contingents, totalContingents, contingentsWithoutContestants, schoolContingents, higherInstContingents, independentContingents } = await prismaExecute(async (prisma) => {
    // Build where clause for searching
    const whereClause = searchTerm ? {
      OR: [
        { name: { contains: searchTerm } },
        { school: { name: { contains: searchTerm } } },
        { higherInstitution: { name: { contains: searchTerm } } }
      ]
    } : {};
    
    // Get total count for pagination
    const totalContingents = await prisma.contingent.count({
      where: whereClause
    });
    
    // Get contingents with details and pagination
    const contingentsWithDetails = await prisma.contingent.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize,
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
    });
    
    // Get contingents without contestants
    const contingentsWithoutContestants = await prisma.contingent.findMany({
      where: {
        ...whereClause,
        contestants: {
          none: {}
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: pageSize,
      skip,
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
        ...whereClause,
        schoolId: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: pageSize,
      skip,
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
        ...whereClause,
        higherInstId: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: pageSize,
      skip,
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
    
    // Get independent contingents (neither school nor higher institution associated)
    const independentContingents = await prisma.contingent.findMany({
      where: {
        ...whereClause,
        schoolId: null,
        higherInstId: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: pageSize,
      skip,
      include: {
        _count: {
          select: {
            contestants: true
          }
        }
      }
    });
    
    // Return all contingent data objects
    return {
      contingents: contingentsWithDetails,
      totalContingents,
      contingentsWithoutContestants,
      schoolContingents,
      higherInstContingents,
      independentContingents
    };
  });
  
  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalContingents / pageSize);
  
  // Calculate showing range for pagination display
  const showingFrom = totalContingents === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, totalContingents);

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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contingents</h1>
          <p className="text-muted-foreground">
            Manage all contingents participating in Techlympics 2025
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/contingents/register" className="gap-1">
            <Plus className="h-4 w-4" />
            Add New Contingent
          </Link>
        </Button>
      </div>

      {/* Search and filter controls */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <form method="get">
            <Input 
              type="search" 
              name="search" 
              defaultValue={searchTerm}
              placeholder="Search contingents..." 
              className="pl-8 bg-white" 
            />
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="view" value={viewMode} />
          </form>
        </div>
        <div className="flex gap-2">
          <Link 
            href={`/organizer/contingents?page=${currentPage}${searchTerm ? `&search=${searchTerm}` : ''}&view=card`}
            className={`${buttonVariants({ variant: viewMode === 'card' ? 'default' : 'outline', size: 'sm' })} flex items-center gap-1`}
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
          <Link 
            href={`/organizer/contingents?page=${currentPage}${searchTerm ? `&search=${searchTerm}` : ''}&view=table`}
            className={`${buttonVariants({ variant: viewMode === 'table' ? 'default' : 'outline', size: 'sm' })} flex items-center gap-1`}
          >
            <TableIcon className="h-4 w-4" />
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing <strong>{showingFrom}</strong> to <strong>{showingTo}</strong> of <strong>{totalContingents}</strong> contingents
        </div>
      </div>

      {/* Contingent type tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Contingents</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="higher">Higher Institutions</TabsTrigger>
          <TabsTrigger value="independent">
            <div className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" />
              Independent
            </div>
          </TabsTrigger>
          <TabsTrigger value="no-contestants">No Contestants</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contingents.map((contingent: any) => (
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
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Name</th>
                    <th className="p-2 text-left font-medium">Institution</th>
                    <th className="p-2 text-left font-medium">State</th>
                    <th className="p-2 text-left font-medium">Contestants</th>
                    <th className="p-2 text-left font-medium">Created</th>
                    <th className="p-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contingents.map((contingent: any, i: number) => (
                    <tr key={contingent.id} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2">
                        <Link href={`/organizer/contingents/${contingent.id}`} className="font-medium hover:underline">{contingent.name}</Link>
                      </td>
                      <td className="p-2">{contingent.school?.name || contingent.higherInstitution?.name || 'Independent'}</td>
                      <td className="p-2">{formatStateName(contingent.school?.state || contingent.higherInstitution?.state || '')}</td>
                      <td className="p-2">
                        <Badge className="flex w-10 justify-center items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
                          <Users className="h-3 w-3" /> {contingent._count.contestants}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{format(new Date(contingent.createdAt), 'MMM d, yyyy')}</td>
                      <td className="p-2">
                        <Link 
                          href={`/organizer/contingents/${contingent.id}`} 
                          className="text-xs text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-center mt-6">
            <Button variant="outline">Load More Contingents</Button>
          </div>
        </TabsContent>
        
        <TabsContent value="schools" className="space-y-4">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolContingents?.map((contingent: any) => (
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
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">School Contingent</th>
                    <th className="p-2 text-left font-medium">School Name</th>
                    <th className="p-2 text-left font-medium">State</th>
                    <th className="p-2 text-left font-medium">Contestants</th>
                    <th className="p-2 text-left font-medium">Created</th>
                    <th className="p-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolContingents.map((contingent: any, i: number) => (
                    <tr key={contingent.id} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <School className="h-4 w-4 text-amber-500" />
                          <Link href={`/organizer/contingents/${contingent.id}`} className="font-medium hover:underline">{contingent.name}</Link>
                        </div>
                      </td>
                      <td className="p-2">{contingent.school?.name || 'Unknown School'}</td>
                      <td className="p-2">{formatStateName(contingent.school?.state || '')}</td>
                      <td className="p-2">
                        <Badge className="flex w-10 justify-center items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
                          <Users className="h-3 w-3" /> {contingent._count.contestants}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{format(new Date(contingent.createdAt), 'MMM d, yyyy')}</td>
                      <td className="p-2">
                        <Link 
                          href={`/organizer/contingents/${contingent.id}`} 
                          className="text-xs text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {higherInstContingents?.map((contingent: any) => (
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
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Contingent</th>
                    <th className="p-2 text-left font-medium">Institution</th>
                    <th className="p-2 text-left font-medium">State</th>
                    <th className="p-2 text-left font-medium">Contestants</th>
                    <th className="p-2 text-left font-medium">Created</th>
                    <th className="p-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {higherInstContingents.map((contingent: any, i: number) => (
                    <tr key={contingent.id} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-purple-500" />
                          <Link href={`/organizer/contingents/${contingent.id}`} className="font-medium hover:underline">{contingent.name}</Link>
                        </div>
                      </td>
                      <td className="p-2">{contingent.higherInstitution?.name || 'Unknown Institution'}</td>
                      <td className="p-2">{formatStateName(contingent.higherInstitution?.state || '')}</td>
                      <td className="p-2">
                        <Badge className="flex w-10 justify-center items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
                          <Users className="h-3 w-3" /> {contingent._count.contestants}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{format(new Date(contingent.createdAt), 'MMM d, yyyy')}</td>
                      <td className="p-2">
                        <Link 
                          href={`/organizer/contingents/${contingent.id}`} 
                          className="text-xs text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        
        <TabsContent value="independent" className="space-y-4">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {independentContingents.map((contingent: any) => (
                <Card key={contingent.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <UserRound className="h-4 w-4 text-indigo-500" />
                          <CardTitle className="text-base">{contingent.name}</CardTitle>
                        </div>
                        <CardDescription>
                          Independent Group (Parents/Youth)
                        </CardDescription>
                      </div>
                      <Badge className="flex items-center gap-1 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border-indigo-200">
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
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Independent Contingent</th>
                    <th className="p-2 text-left font-medium">Type</th>
                    <th className="p-2 text-left font-medium">Contestants</th>
                    <th className="p-2 text-left font-medium">Created</th>
                    <th className="p-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {independentContingents.map((contingent: any, i: number) => (
                    <tr key={contingent.id} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <UserRound className="h-4 w-4 text-indigo-500" />
                          <Link href={`/organizer/contingents/${contingent.id}`} className="font-medium hover:underline">{contingent.name}</Link>
                        </div>
                      </td>
                      <td className="p-2">Independent (Parents/Youth)</td>
                      <td className="p-2">
                        <Badge className="flex w-10 justify-center items-center gap-1 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border-indigo-200">
                          <Users className="h-3 w-3" /> {contingent._count.contestants}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{format(new Date(contingent.createdAt), 'MMM d, yyyy')}</td>
                      <td className="p-2">
                        <Link 
                          href={`/organizer/contingents/${contingent.id}`} 
                          className="text-xs text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {independentContingents.length > 0 && (
            <div className="text-center mt-6">
              <Button variant="outline">View All Independent Contingents</Button>
            </div>
          )}
          {independentContingents.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <UserRound className="h-8 w-8 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No Independent Contingents Found</h3>
                <p className="text-muted-foreground">There are no independent (parent/youth group) contingents registered yet.</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-1" /> Create Independent Contingent
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="no-contestants" className="space-y-4">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contingentsWithoutContestants.map((contingent: any) => (
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
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Empty Contingent</th>
                    <th className="p-2 text-left font-medium">Institution</th>
                    <th className="p-2 text-left font-medium">State</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Created</th>
                    <th className="p-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contingentsWithoutContestants.map((contingent: any, i: number) => (
                    <tr key={contingent.id} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          <Link href={`/organizer/contingents/${contingent.id}`} className="font-medium hover:underline">{contingent.name}</Link>
                        </div>
                      </td>
                      <td className="p-2">{contingent.school?.name || contingent.higherInstitution?.name || 'Independent'}</td>
                      <td className="p-2">{formatStateName(contingent.school?.state || contingent.higherInstitution?.state || '')}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="flex items-center gap-1 text-red-600 bg-red-100">
                          <AlertCircle className="h-3 w-3" /> No Contestants
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{format(new Date(contingent.createdAt), 'MMM d, yyyy')}</td>
                      <td className="p-2">
                        <Link 
                          href={`/organizer/contingents/${contingent.id}`} 
                          className="text-xs text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button 
            variant="outline" 
            disabled={currentPage <= 1}
            asChild
          >
            <Link href={`/organizer/contingents?page=${currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ''}`}>
              Previous
            </Link>
          </Button>
          
          <div className="flex items-center space-x-1">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              // Create a window of pages to display
              if (
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1) ||
                (totalPages <= 7) ||
                (currentPage <= 3 && page <= 5) ||
                (currentPage >= totalPages - 2 && page >= totalPages - 4)
              ) {
                return (
                  <Button 
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={`/organizer/contingents?page=${page}${searchTerm ? `&search=${searchTerm}` : ''}`}>
                      {page}
                    </Link>
                  </Button>
                );
              } else if (
                (page === currentPage - 2 && currentPage > 3) ||
                (page === currentPage + 2 && currentPage < totalPages - 2)
              ) {
                return <span key={page} className="px-2">...</span>;
              }
              return null;
            })}
          </div>
          
          <Button 
            variant="outline" 
            disabled={currentPage >= totalPages}
            asChild
          >
            <Link href={`/organizer/contingents?page=${currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ''}`}>
              Next
            </Link>
          </Button>
        </div>
      )}
      
      <div className="text-xs text-center text-muted-foreground mt-2">
        {totalContingents > 0 ? (
          <p>Showing {showingFrom} to {showingTo} of {totalContingents} contingents</p>
        ) : (
          <p>No contingents found</p>
        )}
      </div>
    </div>
  );
}
