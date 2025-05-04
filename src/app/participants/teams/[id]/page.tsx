"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Trophy,
  Users,
  ChevronLeft,
  User,
  Clock,
  Edit,
  Trash2,
  CalendarIcon,
  Building,
  School,
  Info
} from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface TeamMember {
  id: number;
  contestantId: number;
  contestantName: string;
  status: string;
  joinDate: string;
  icNumber?: string;
  email?: string;
  gender?: string;
  educationLevel?: string;
}

interface Team {
  id: number;
  name: string;
  hashcode: string;
  description?: string;
  status: string;
  contestId: number;
  contestName: string;
  contingentId: number;
  contingentName: string;
  institutionName?: string;
  institutionType?: string;
  members: TeamMember[];
  maxMembers: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch the team details
  useEffect(() => {
    const fetchTeam = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/participants/teams/${params.id}`, {
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch team details");
        }
        
        const data = await response.json();
        setTeam(data);
      } catch (error) {
        console.error("Error fetching team details:", error);
        toast.error("Failed to load team details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeam();
  }, [session, params.id]);
  
  // Handle team deletion
  const handleDeleteTeam = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/participants/teams/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete team");
      }
      
      toast.success("Team deleted successfully");
      setDeleteDialogOpen(false);
      router.push("/participants/teams");
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error(error.message || "Failed to delete team");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-600 border-green-500/20';
      case 'INACTIVE':
        return 'bg-gray-500/20 text-gray-600 border-gray-500/20';
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-600 border-amber-500/20';
      default:
        return 'bg-blue-500/20 text-blue-600 border-blue-500/20';
    }
  };
  
  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link href="/participants/teams">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Team Details</h1>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !team ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Team not found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              The team you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild>
              <Link href="/participants/teams">
                Return to Teams
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  <CardDescription>{team.hashcode}</CardDescription>
                </div>
                <Badge className={`${getStatusColor(team.status)} w-fit`}>
                  {team.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Team Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground block">Contest</span>
                      <span className="font-medium">{team.contestName}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground block">Contingent</span>
                      <span className="font-medium">{team.contingentName}</span>
                    </div>
                    
                    {team.institutionName && (
                      <div>
                        <span className="text-sm text-muted-foreground block">Institution</span>
                        <div className="flex items-center">
                          {team.institutionType === 'SCHOOL' ? (
                            <School className="h-4 w-4 mr-1 text-muted-foreground" />
                          ) : (
                            <Building className="h-4 w-4 mr-1 text-muted-foreground" />
                          )}
                          <span className="font-medium">{team.institutionName}</span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-muted-foreground block">Team Size</span>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{team.members.length} / {team.maxMembers} members</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Additional Information</h3>
                  <div className="space-y-3">
                    {team.description && (
                      <div>
                        <span className="text-sm text-muted-foreground block">Description</span>
                        <span className="font-medium">{team.description}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-muted-foreground block">Created On</span>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{formatDate(team.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground block">Last Updated</span>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{formatDate(team.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
              {team.isOwner && (
                <>
                  <Button variant="outline" asChild>
                    <Link href={`/participants/teams/${team.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Team
                    </Link>
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Team
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
          
          <Tabs defaultValue="members">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="members" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Team Members
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="members" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage contestants in your team
                      </CardDescription>
                    </div>
                    <Button asChild>
                      <Link href={`/participants/teams/${team.id}/members`}>
                        <Users className="mr-2 h-4 w-4" />
                        Manage Members
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {team.members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">No members yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md">
                        This team doesn't have any members yet. Add contestants to your team to participate in the competition.
                      </p>
                      <Button asChild>
                        <Link href={`/participants/teams/${team.id}/members`}>
                          <Users className="mr-2 h-4 w-4" />
                          Add Members
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px] rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>IC Number</TableHead>
                            <TableHead>Education</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {team.members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">{member.contestantName}</TableCell>
                              <TableCell>{member.icNumber || "—"}</TableCell>
                              <TableCell>{member.educationLevel || "—"}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(member.status)}>
                                  {member.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(member.joinDate)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the team "{team?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete Team"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
