"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Trophy,
  Users,
  Plus,
  Search,
  School,
  Building,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Clock,
  EyeIcon
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  memberCount: number;
  maxMembers: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch the user's teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        const participantId = session.user.id;
        const response = await fetch(`/api/participants/teams?participantId=${participantId}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch teams");
        }
        
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        console.error("Error fetching teams:", error);
        toast.error("Failed to load your teams");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeams();
  }, [session]);
  
  // Filter teams based on search term
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.hashcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.contestName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle team deletion
  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/participants/teams/${teamToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete team");
      }
      
      // Remove the deleted team from the state
      setTeams(teams.filter(team => team.id !== teamToDelete.id));
      toast.success("Team deleted successfully");
      setDeleteDialogOpen(false);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Teams</h1>
          <p className="text-muted-foreground">
            Manage your teams for Techlympics competitions
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search teams..."
              className="pl-8 w-full sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button asChild>
            <Link href="/participants/teams/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            View, edit, and manage your Techlympics competition teams
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No teams found</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {teams.length === 0
                  ? "You haven't created any teams yet. Create your first team to participate in Techlympics competitions."
                  : "No teams match your search criteria. Try a different search term."}
              </p>
              {teams.length === 0 && (
                <Button asChild>
                  <Link href="/participants/teams/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Team
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Contest</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.hashcode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{team.contestName}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.contingentName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex gap-1 items-center w-fit">
                          <Users className="h-3 w-3" />
                          {team.memberCount} / {team.maxMembers}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(team.status)}>
                          {team.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatDate(team.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild title="View Team Details">
                            <Link href={`/participants/teams/${team.id}`}>
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button variant="outline" size="sm" asChild title="Edit Team">
                            <Link href={`/participants/teams/${team.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button variant="outline" size="sm" asChild title="Manage Team Members">
                            <Link href={`/participants/teams/${team.id}/members`}>
                              <Users className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          {team.isOwner && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:bg-red-100 hover:text-red-700" 
                              title="Delete Team"
                              onClick={() => {
                                setTeamToDelete(team);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the team "{teamToDelete?.name}"? This action cannot be undone.
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
