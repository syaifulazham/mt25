"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ChevronLeft,
  User,
  Users,
  Search,
  Plus,
  Trash2,
  Info,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  isManager: boolean;
  minAge?: number;  // Min age from the contest
  maxAge?: number;  // Max age from the contest
  createdAt: string;
  updatedAt: string;
}

interface Contestant {
  id: number;
  name: string;
  icNumber: string;
  email?: string;
  gender?: string;
  age?: number;
  educationLevel?: string;
  status: string;
  inTeam: boolean;
}

export default function TeamMembersPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [filteredContestants, setFilteredContestants] = useState<Contestant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [educationFilter, setEducationFilter] = useState("all");
  const [confirmRemoveDialogOpen, setConfirmRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  
  // Fetch the team details and available contestants
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        // Fetch team details
        const teamResponse = await fetch(`/api/participants/teams/${params.id}`, {
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!teamResponse.ok) {
          throw new Error("Failed to fetch team details");
        }
        
        const teamData = await teamResponse.json();
        // Log full team data for debugging permission issues
        console.log('Team data received:', {
          id: teamData.id,
          name: teamData.name,
          isOwner: teamData.isOwner,
          isManager: teamData.isManager,
        });
        setTeam(teamData);
        
        // Fetch available contestants
        const contestantsResponse = await fetch(`/api/participants/contestants`, {
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!contestantsResponse.ok) {
          throw new Error("Failed to fetch contestants");
        }
        
        const contestantsData = await contestantsResponse.json();
        
        // Handle both response formats (array or paginated object)
        const contestantsArray = Array.isArray(contestantsData) 
          ? contestantsData 
          : contestantsData.data || [];
        
        // Mark contestants who are already in a team
        const enhancedContestants = contestantsArray.map((contestant: Contestant) => ({
          ...contestant,
          inTeam: teamData.members.some((member: TeamMember) => member.contestantId === contestant.id)
        }));
        
        setContestants(enhancedContestants);
        setFilteredContestants(enhancedContestants);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        // Show more specific error message
        if (error.message) {
          toast.error(`Failed to load data: ${error.message}`);
        } else {
          toast.error("Failed to load data");
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [session, params.id]);
  
  // Filter contestants based on search term, education level, and age criteria
  useEffect(() => {
    if (!contestants.length || !team) return;
    
    let filtered = [...contestants];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(contestant => 
        contestant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contestant.icNumber && contestant.icNumber.includes(searchTerm)) ||
        (contestant.email && contestant.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply education level filter
    if (educationFilter !== "all") {
      filtered = filtered.filter(contestant => 
        contestant.educationLevel?.toLowerCase() === educationFilter.toLowerCase()
      );
    }
    
    // Apply age criteria filter based on contest requirements
    // Safely destructure with default values
    const minAge = team?.minAge;
    const maxAge = team?.maxAge;
    
    if (minAge || maxAge) {
      filtered = filtered.filter(contestant => {
        // Skip filtering if contestant doesn't have age
        if (contestant.age === undefined || contestant.age === null) return true;
        
        // Check minimum age requirement
        if (minAge !== undefined && minAge !== null && contestant.age < minAge) return false;
        
        // Check maximum age requirement
        if (maxAge !== undefined && maxAge !== null && contestant.age > maxAge) return false;
        
        return true;
      });
    }
    
    setFilteredContestants(filtered);
  }, [searchTerm, educationFilter, contestants, team]);
  
  // Handle adding a contestant to the team
  const handleAddMember = async (contestantId: number) => {
    try {
      setIsAddingMember(true);
      
      const response = await fetch(`/api/participants/teams/${params.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contestantId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add contestant to team");
      }
      
      // Update local state
      const updatedTeam = await response.json();
      setTeam(updatedTeam);
      
      // Mark contestant as added
      setContestants(prevContestants => 
        prevContestants.map(contestant => 
          contestant.id === contestantId 
            ? { ...contestant, inTeam: true } 
            : contestant
        )
      );
      
      toast.success("Contestant added to team successfully");
    } catch (error: any) {
      console.error("Error adding contestant to team:", error);
      toast.error(error.message || "Failed to add contestant to team");
    } finally {
      setIsAddingMember(false);
    }
  };
  
  // Handle removing a contestant from the team
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      setIsRemoving(true);
      
      const response = await fetch(`/api/participants/teams/${params.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamMemberId: memberToRemove.id }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove contestant from team");
      }
      
      // Update local state
      const updatedTeam = await response.json();
      setTeam(updatedTeam);
      
      // Mark contestant as removed
      setContestants(prevContestants => 
        prevContestants.map(contestant => 
          contestant.id === memberToRemove.contestantId 
            ? { ...contestant, inTeam: false } 
            : contestant
        )
      );
      
      toast.success("Contestant removed from team successfully");
      setConfirmRemoveDialogOpen(false);
    } catch (error: any) {
      console.error("Error removing contestant from team:", error);
      toast.error(error.message || "Failed to remove contestant from team");
    } finally {
      setIsRemoving(false);
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
  
  const getEducationLevelText = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'sekolah rendah':
        return 'Primary School';
      case 'sekolah menengah':
        return 'Secondary School';
      case 'belia':
        return 'Youth';
      default:
        return level || 'Unknown';
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
          <Link href={`/participants/teams/${params.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Manage Team Members</h1>
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
      ) : !(team.isOwner === true || team.isManager === true) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Permission Denied</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              You don't have permission to manage members for this team. Only team owners and contingent managers can add or remove members.
            </p>
            <Button asChild>
              <Link href={`/participants/teams/${params.id}`}>
                Return to Team Details
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Current members in {team.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex gap-1 items-center">
                    <Users className="h-3 w-3" />
                    {team.members.length} / {team.maxMembers}
                  </Badge>
                </div>
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
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>IC Number</TableHead>
                        <TableHead>Education</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.contestantName}</TableCell>
                          <TableCell>{member.icNumber || "—"}</TableCell>
                          <TableCell>{member.educationLevel ? getEducationLevelText(member.educationLevel) : "—"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(member.status)}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(member.joinDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMemberToRemove(member);
                                setConfirmRemoveDialogOpen(true);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Add Team Members</CardTitle>
                  <CardDescription>
                    Select contestants to add to this team
                    {team && (team.minAge || team.maxAge) && (
                      <>
                        <br />
                        <span className="text-xs text-amber-600 mt-1 inline-block">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          Age restrictions: 
                          {team.minAge !== undefined && team.maxAge !== undefined ? (
                            `${team.minAge} to ${team.maxAge} years old`
                          ) : team.minAge !== undefined ? (
                            `Minimum ${team.minAge} years old`
                          ) : team.maxAge !== undefined ? (
                            `Maximum ${team.maxAge} years old`
                          ) : ''
                          }
                        </span>
                      </>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search contestants..."
                      className="pl-8 w-[200px] md:w-[260px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Select
                    value={educationFilter}
                    onValueChange={setEducationFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="sekolah rendah">Primary School</SelectItem>
                      <SelectItem value="sekolah menengah">Secondary School</SelectItem>
                      <SelectItem value="belia">Youth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredContestants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No contestants found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    {contestants.length === 0
                      ? "You haven't created any contestants yet. Create contestants first to add them to your team."
                      : "No contestants match your search criteria. Try a different search term or filter."}
                  </p>
                  {contestants.length === 0 && (
                    <Button asChild>
                      <Link href="/participants/contestants/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Contestant
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>IC Number</TableHead>
                          <TableHead>Education</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContestants.map((contestant) => (
                          <TableRow key={contestant.id}>
                            <TableCell className="font-medium">{contestant.name}</TableCell>
                            <TableCell>{contestant.icNumber}</TableCell>
                            <TableCell>{contestant.educationLevel ? getEducationLevelText(contestant.educationLevel) : "—"}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(contestant.status)}>
                                {contestant.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {contestant.inTeam ? (
                                <Badge variant="outline" className="bg-green-50">
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                  Added
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleAddMember(contestant.id)}
                                  disabled={isAddingMember || team.members.length >= team.maxMembers}
                                >
                                  {isAddingMember ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4 mr-1" />
                                  )}
                                  Add
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            {team.members.length >= team.maxMembers && (
              <CardFooter>
                <div className="bg-amber-50 p-3 rounded-md text-amber-800 text-sm flex items-start w-full">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
                  <p>
                    You've reached the maximum team size ({team.maxMembers} members). 
                    Remove existing members before adding new ones.
                  </p>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      )}
      
      {/* Remove member confirmation dialog */}
      <Dialog open={confirmRemoveDialogOpen} onOpenChange={setConfirmRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-medium">{memberToRemove?.contestantName}</span> from the team? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveDialogOpen(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
