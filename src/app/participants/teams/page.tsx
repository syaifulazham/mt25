"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
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

// Define properties for nested objects
interface ContestantData {
  id?: number;
  name?: string;
  gender?: string;
  age?: number;
  educationLevel?: string;
}

interface ParticipantData {
  id?: number;
  name?: string; 
  gender?: string;
}

interface TeamMember {
  id: number;
  contestantId: number;
  contestantName?: string;
  status: string;
  gender?: string;
  age?: number;
  educationLevel?: string;
  // Add properties that might exist in different API response formats
  name?: string;
  contestant?: ContestantData;
  participant?: ParticipantData;
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
  memberCount: number;
  maxMembers: number;
  contestMaxMembers: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
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
        // Get teams data
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
        
        const teamsData = await response.json();
        
        // Fetch detailed information for each team, including members
        const teamsWithMembers = await Promise.all(teamsData.map(async (team: Team) => {
          try {
            // Get detailed team data (which includes members)
            // This uses the same endpoint as the members page
            const detailedTeamResponse = await fetch(`/api/participants/teams/${team.id}`, {
              headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (detailedTeamResponse.ok) {
              const detailedTeamData = await detailedTeamResponse.json();
              
              // Return team with real member data
              return {
                ...team,
                members: detailedTeamData.members || []
              };
            }
          } catch (error) {
            console.error(`Error fetching detailed data for team ${team.id}:`, error);
          }
          
          // Fallback to an empty members array if the fetch fails
          return {
            ...team,
            members: []
          };
        }));
        
        setTeams(teamsWithMembers);
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
      toast.success(t('team.delete_success'));
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error(error.message || t('team.delete_error'));
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
  
  // Translate status
  const translateStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return t('team.status.active');
      case 'INACTIVE':
        return t('team.status.inactive');
      case 'PENDING':
        return t('team.status.pending');
      default:
        return status;
    }
  };
  
  // Get contest theme color scheme
  const getContestColorScheme = (contestId: number) => {
    // This is a simple implementation - we could fetch actual theme colors from an API
    // but for now we'll use a deterministic algorithm based on contestId
    const themeMap: Record<number, { bg: string, border: string, hover: string, text: string }> = {
      1: { 
        bg: 'bg-blue-50 dark:bg-blue-900/20', 
        border: 'border-blue-200 dark:border-blue-800', 
        hover: 'hover:border-blue-300 dark:hover:border-blue-700',
        text: 'text-blue-800 dark:text-blue-300'
      },
      2: { 
        bg: 'bg-purple-50 dark:bg-purple-900/20', 
        border: 'border-purple-200 dark:border-purple-800', 
        hover: 'hover:border-purple-300 dark:hover:border-purple-700',
        text: 'text-purple-800 dark:text-purple-300'
      },
      3: { 
        bg: 'bg-green-50 dark:bg-green-900/20', 
        border: 'border-green-200 dark:border-green-800', 
        hover: 'hover:border-green-300 dark:hover:border-green-700', 
        text: 'text-green-800 dark:text-green-300'
      },
      4: { 
        bg: 'bg-red-50 dark:bg-red-900/20', 
        border: 'border-red-200 dark:border-red-800', 
        hover: 'hover:border-red-300 dark:hover:border-red-700', 
        text: 'text-red-800 dark:text-red-300'
      },
      5: { 
        bg: 'bg-amber-50 dark:bg-amber-900/20', 
        border: 'border-amber-200 dark:border-amber-800', 
        hover: 'hover:border-amber-300 dark:hover:border-amber-700', 
        text: 'text-amber-800 dark:text-amber-300'
      },
      6: { 
        bg: 'bg-cyan-50 dark:bg-cyan-900/20', 
        border: 'border-cyan-200 dark:border-cyan-800', 
        hover: 'hover:border-cyan-300 dark:hover:border-cyan-700', 
        text: 'text-cyan-800 dark:text-cyan-300'
      },
      7: { 
        bg: 'bg-pink-50 dark:bg-pink-900/20', 
        border: 'border-pink-200 dark:border-pink-800', 
        hover: 'hover:border-pink-300 dark:hover:border-pink-700', 
        text: 'text-pink-800 dark:text-pink-300'
      },
      8: { 
        bg: 'bg-indigo-50 dark:bg-indigo-900/20', 
        border: 'border-indigo-200 dark:border-indigo-800', 
        hover: 'hover:border-indigo-300 dark:hover:border-indigo-700', 
        text: 'text-indigo-800 dark:text-indigo-300'
      },
      9: { 
        bg: 'bg-orange-50 dark:bg-orange-900/20', 
        border: 'border-orange-200 dark:border-orange-800', 
        hover: 'hover:border-orange-300 dark:hover:border-orange-700', 
        text: 'text-orange-800 dark:text-orange-300'
      },
      10: { 
        bg: 'bg-teal-50 dark:bg-teal-900/20', 
        border: 'border-teal-200 dark:border-teal-800', 
        hover: 'hover:border-teal-300 dark:hover:border-teal-700', 
        text: 'text-teal-800 dark:text-teal-300'
      },
    };
    
    // If contestId is in our map, use that, otherwise use a hash function to pick a color
    if (themeMap[contestId]) {
      return themeMap[contestId];
    } else {
      // Simple hash function to get a number between 1-10
      const hash = contestId % 10 || 10;
      return themeMap[hash];
    }
  };
  
  // Group teams by contest
  const groupTeamsByContest = (teams: Team[]) => {
    const grouped: Record<string, Team[]> = {};
    
    teams.forEach(team => {
      const contestId = team.contestId.toString();
      if (!grouped[contestId]) {
        grouped[contestId] = [];
      }
      grouped[contestId].push(team);
    });
    
    return Object.entries(grouped).map(([contestId, teams]) => ({
      contestId: parseInt(contestId),
      contestName: teams[0].contestName,
      teams
    }));
  };
  
  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('team.title')}</h1>
          <p className="text-muted-foreground">
            {t('team.description')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('team.search')}
              className="pl-8 w-full sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button asChild>
            <Link href="/participants/teams/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('team.create')}
            </Link>
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t('team.none_found')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {teams.length === 0
                ? t('team.none_added')
                : t('team.no_search_results')}
            </p>
            {teams.length === 0 && (
              <Button asChild>
                <Link href="/participants/teams/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('team.create_first')}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupTeamsByContest(filteredTeams).map((contestGroup) => (
            <div key={contestGroup.contestId} className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <h2 className="text-xl font-semibold">{contestGroup.contestName}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contestGroup.teams.map((team) => {
                  const colorScheme = getContestColorScheme(team.contestId);
                  return (
                    <div
                      key={team.id}
                      className={`relative group overflow-hidden rounded-lg border ${colorScheme.border} ${colorScheme.bg} ${colorScheme.hover} transition-all duration-200 shadow-sm hover:shadow-md`}
                    >
                      {/* Status indicator */}
                      <div className="absolute top-2 right-2">
                        <Badge className={getStatusColor(team.status)}>
                          {translateStatus(team.status)}
                        </Badge>
                      </div>
                      
                      {/* Card content */}
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className={`text-lg font-bold ${colorScheme.text}`}>{team.name}</h3>
                          <p className="text-xs text-muted-foreground">{team.hashcode}</p>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Contest info */}
                          <div className="flex items-start gap-2">
                            <Trophy className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm font-medium">{team.contestName}</div>
                              <div className="text-xs text-muted-foreground">{team.contingentName}</div>
                            </div>
                          </div>
                          
                          {/* Members count */}
                          <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="w-full">
                              <div className="text-sm">
                                <span className="font-medium">{team.memberCount}</span> of <span className="font-medium">{team.contestMaxMembers}</span> {t('team.members_count')}
                              </div>
                              
                              {/* Team Members List */}
                              {team.members && team.members.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {team.members.map((member, index) => {
                                    // Handle different property naming in API responses
                                    let name = '';
                                    // Try different property names that might contain the contestant name
                                    if (member.contestantName) {
                                      name = member.contestantName;
                                    } else if (member.contestant && member.contestant.name) {
                                      name = member.contestant.name;
                                    } else if (member.name) {
                                      name = member.name;
                                    }
                                    
                                    // If we still don't have a name, check for participant data
                                    if (!name && member.participant && member.participant.name) {
                                      name = member.participant.name;
                                    }
                                    
                                    // Same for gender - check different possible locations
                                    let gender = 'male';
                                    if (member.gender) {
                                      gender = member.gender;
                                    } else if (member.contestant && member.contestant.gender) {
                                      gender = member.contestant.gender;
                                    }
                                    
                                    const memberId = member.id || member.contestantId || index;
                                    
                                    return (
                                      <div key={memberId} className="flex items-center gap-1.5 text-sm">
                                        {/* Gender icon */}
                                        {gender?.toLowerCase() === 'female' ? (
                                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-900/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 text-pink-500 dark:text-pink-300">
                                              <circle cx="12" cy="8" r="5" />
                                              <path d="M12 13v8M9 18h6" />
                                            </svg>
                                          </span>
                                        ) : (
                                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 text-blue-500 dark:text-blue-300">
                                              <circle cx="12" cy="8" r="5" />
                                              <path d="M20 20l-3.5-3.5M13.5 13.5L17 17M6 20l3.5-3.5M10.5 13.5L7 17" />
                                            </svg>
                                          </span>
                                        )}
                                        
                                        {/* Member name */}
                                        <span className="truncate">{name}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Creation date */}
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="text-sm">
                              {t('team.created_on')} {formatDate(team.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="mt-6 flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild title="View Team Details">
                            <Link href={`/participants/teams/${team.id}`}>
                              <EyeIcon className="h-4 w-4 mr-1" />
                              {t('team.view')}
                            </Link>
                          </Button>
                          
                          <Button variant="outline" size="sm" asChild title="Manage Team Members">
                            <Link href={`/participants/teams/${team.id}/members`}>
                              <Users className="h-4 w-4 mr-1" />
                              {t('team.members')}
                            </Link>
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <button 
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-1"
                                title={t('team.more_actions')}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                {t('team.team_actions')}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/participants/teams/${team.id}/edit`} className="w-full cursor-pointer">
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('team.edit')}
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <Link href={`/participants/teams/${team.id}`} className="w-full cursor-pointer">
                                  <EyeIcon className="h-4 w-4 mr-2" />
                                  {t('team.view_details')}
                                </Link>
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem asChild>
                                <Link href={`/participants/teams/${team.id}/members`} className="w-full cursor-pointer">
                                  <Users className="h-4 w-4 mr-2" />
                                  {t('team.manage_members')}
                                </Link>
                              </DropdownMenuItem>
                              
                              {team.isOwner && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                                    onClick={() => {
                                      setTeamToDelete(team);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('team.delete')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.delete_title')}</DialogTitle>
            <DialogDescription>
              {t('team.delete_confirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('team.cancel')}
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
                  {t('team.deleting')}
                </>
              ) : (
                <>{t('team.delete')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
