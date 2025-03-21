import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/session';
import { hasRequiredRole } from '@/lib/auth';
import { PlusIcon, SearchIcon, FilterIcon } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';

// Helper function to get status badge color
function getStatusBadge(startDate: Date, endDate: Date) {
  const now = new Date();
  
  if (now < startDate) {
    return <Badge className="bg-blue-500">Upcoming</Badge>;
  } else if (now > endDate) {
    return <Badge className="bg-gray-500">Completed</Badge>;
  } else {
    return <Badge className="bg-green-500">Active</Badge>;
  }
}

// Helper function to get contest type display name
function getContestTypeDisplay(contestType: string) {
  const displayMap: Record<string, string> = {
    QUIZ: 'Quiz',
    CODING: 'Coding',
    STRUCTURE_BUILDING: 'Structure Building',
    FASTEST_COMPLETION: 'Fastest Completion',
    POSTER_PRESENTATION: 'Poster Presentation',
    SCIENCE_PROJECT: 'Science Project',
    ENGINEERING_DESIGN: 'Engineering Design',
    ANALYSIS_CHALLENGE: 'Analysis Challenge'
  };
  
  return displayMap[contestType] || contestType;
}

export default async function ContestsPage() {
  const user = await getCurrentUser();
  
  // Check if user is authenticated
  if (!user) {
    redirect("/organizer/auth/login?redirect=/organizer/contests");
  }
  
  // Check if user has required role
  if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
    // Redirect to dashboard if they don't have permission
    redirect("/organizer/dashboard");
  }

  // Fetch contests from database
  const contests = await prisma.contest.findMany({
    include: {
      _count: {
        select: {
          contingents: true
        }
      },
      targetGroup: true
    },
    orderBy: {
      startDate: 'desc'
    }
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contest Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage Techlympics contests
          </p>
        </div>
        <Link href="/organizer/contests/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Contest
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Contest Filters</CardTitle>
          <CardDescription>
            Filter contests by name, category, or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search contests..."
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="">All Contest Types</option>
                <option value="QUIZ">Quiz</option>
                <option value="CODING">Coding</option>
                <option value="STRUCTURE_BUILDING">Structure Building</option>
                <option value="FASTEST_COMPLETION">Fastest Completion</option>
                <option value="POSTER_PRESENTATION">Poster Presentation</option>
                <option value="SCIENCE_PROJECT">Science Project</option>
                <option value="ENGINEERING_DESIGN">Engineering Design</option>
                <option value="ANALYSIS_CHALLENGE">Analysis Challenge</option>
              </select>
            </div>
            <div className="w-[200px]">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Contests</CardTitle>
          <CardDescription>
            Showing {contests.length} contests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contests.map((contest) => (
                <TableRow key={contest.id}>
                  <TableCell className="font-medium">{contest.name}</TableCell>
                  <TableCell>{getContestTypeDisplay(contest.contestType)}</TableCell>
                  <TableCell>{format(contest.startDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(contest.endDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(contest.startDate, contest.endDate)}</TableCell>
                  <TableCell>{contest._count.contingents}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/organizer/contests/${contest.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/organizer/contests/${contest.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
