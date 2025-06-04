"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MoreHorizontal, 
  UserPlus,
  Trash,
  RefreshCw,
  User,
  Users,
  Calendar,
  Trophy
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { useContingent, Contestant } from './contingent-context';

interface SurveyStatus {
  id: number;
  name: string;
  status: "not_started" | "partial" | "completed";
  totalQuestions: number;
  answeredQuestions: number;
}

interface TeamMember {
  id: number;
  teamId: number;
  contestantId: number;
  role?: string;
  joinedAt: string;
  contestant: Contestant;
}

interface TeamDetailsProps {
  team: any;
  onClose: () => void;
}

const TeamDetailsDialog: React.FC<TeamDetailsProps> = ({ team, onClose }) => {
  const { contestants, refreshTeams } = useContingent();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [selectedContestantId, setSelectedContestantId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("Member");
  
  // Survey status state variables
  const [surveyStatuses, setSurveyStatuses] = useState<Record<number, SurveyStatus[]>>({});
  const [loadingSurveys, setLoadingSurveys] = useState<boolean>(false);

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/organizer/teams/${team.id}/members`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch team members: ${response.status}`);
      }
      
      const data = await response.json();
      setMembers(data);
      
      // After fetching members, get their survey statuses
      await fetchSurveyStatuses(data);
      
    } catch (err) {
      console.error("Error fetching team members:", err);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch survey statuses for team members
  const fetchSurveyStatuses = async (teamMembers: TeamMember[]) => {
    setLoadingSurveys(true);
    try {
      // Debug: Log team members
      console.log("DEBUG: Fetching survey statuses for members:", teamMembers.map(m => m.contestantId));
      
      const statuses: Record<number, SurveyStatus[]> = {};
      
      // Fetch survey status for each member in parallel
      await Promise.all(teamMembers.map(async (member) => {
        try {
          console.log(`DEBUG: Fetching survey status for contestant ${member.contestantId}`);
          const response = await fetch(`/api/survey-status/contestant?contestantId=${member.contestantId}`, {
            credentials: 'include', // Include authentication cookies
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`DEBUG: Survey API response for ${member.contestantId}:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`DEBUG: Survey data for ${member.contestantId}:`, data);
            
            // Extract surveys array from the response
            if (data && data.surveys) {
              statuses[member.contestantId] = data.surveys;
              console.log(`DEBUG: Found ${data.surveys.length} surveys for contestant ${member.contestantId}`);
            } else {
              console.log(`DEBUG: No surveys array found in response for contestant ${member.contestantId}`);
            }
          } else {
            const errorText = await response.text();
            console.error(`DEBUG: Error response for ${member.contestantId}:`, response.status, errorText);
            // Use toast for user-friendly error notification only for non-auth errors
            if (response.status !== 401) {
              toast.error(`Error loading survey data: ${response.status}`);
            }
          }
        } catch (error) {
          console.error(`Error fetching survey status for contestant ${member.contestantId}:`, error);
        }
      }));
      
      setSurveyStatuses(statuses);
      console.log('FINAL SURVEY STATUSES OBJECT:', statuses);
      console.log('Is the object empty?', Object.keys(statuses).length === 0);
      
      // Check if each contestantId has entries
      if (teamMembers.length > 0) {
        teamMembers.forEach(member => {
          console.log(`Member ${member.contestantId} has surveys:`, !!statuses[member.contestantId], 
            statuses[member.contestantId] ? `Count: ${statuses[member.contestantId].length}` : 'No surveys');
        });
      }
      
      setLoadingSurveys(false);
    } catch (error) {
      console.error('Error fetching survey statuses:', error);
      setLoadingSurveys(false);
    }
  };

  // Load team members on initial render
  useEffect(() => {
    fetchTeamMembers();
  }, [team.id]);

  // Handle adding a new member
  const handleAddMember = async () => {
    if (!selectedContestantId) {
      toast.error("Please select a contestant");
      return;
    }

    try {
      const response = await fetch(`/api/organizer/teams/${team.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contestantId: parseInt(selectedContestantId),
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add team member');
      }

      await fetchTeamMembers();
      refreshTeams();
      setIsAddingMember(false);
      setSelectedContestantId("");
      setSelectedRole("Member");
      toast.success("Team member added successfully");
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error(`Failed to add team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle removing a member
  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/organizer/teams/${team.id}/members/${selectedMember.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove team member: ${response.status}`);
      }

      await fetchTeamMembers();
      refreshTeams();
      setIsRemovingMember(false);
      setSelectedMember(null);
      toast.success("Team member removed successfully");
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get available contestants (not already in team)
  const availableContestants = contestants.filter(
    contestant => !members.some(member => member.contestantId === contestant.id)
  );

  return (
    <div className="space-y-6 pt-4">
      {/* Team Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{team.name}</CardTitle>
          <CardDescription>
            Team ID: {team.id} | Hashcode: <code className="text-sm">{team.hashcode}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Contest:</span>
              <span>{team.contestName || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Members:</span>
              <span>{members.length} / {team.maxMembers}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={team.status === "ACTIVE" ? "default" : "secondary"}>
                {team.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Created:</span>
              <span>{formatDate(team.createdAt)}</span>
            </div>
            {team.description && (
              <div className="col-span-3 mt-2">
                <span className="font-medium">Description:</span>
                <p className="mt-1 text-muted-foreground">{team.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {members.length} of {team.maxMembers} members
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchTeamMembers}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                size="sm"
                onClick={() => setIsAddingMember(true)} 
                disabled={members.length >= team.maxMembers || availableContestants.length === 0}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>IC</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.contestant.name}</span>
                        {/* Debug button */}
                        <div 
                          className="inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium bg-blue-200 hover:bg-blue-300 cursor-pointer ml-1"
                          onClick={() => console.log(`DEBUG: Member ${member.contestantId}`, member, `Survey statuses:`, surveyStatuses)}
                        >
                          Debug
                        </div>
                        {/* Survey status buttons placed beside member name */}
                        <div className="flex gap-1">
                          {/* Debugging info */}
                          <div 
                            className="inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium bg-purple-200 hover:bg-purple-300 cursor-pointer mr-1"
                            onClick={() => {
                              const hasSurveys = surveyStatuses && surveyStatuses[member.contestantId]?.length > 0;
                              console.log(`Rendering conditions for ${member.contestant.name} (ID: ${member.contestantId}):`); 
                              console.log(`- Loading? ${loadingSurveys}`); 
                              console.log(`- Has surveyStatuses? ${!!surveyStatuses}`); 
                              console.log(`- Has entry for this contestant? ${surveyStatuses && !!surveyStatuses[member.contestantId]}`); 
                              console.log(`- Length check: ${surveyStatuses && surveyStatuses[member.contestantId]?.length}`); 
                              console.log(`- Rendering path: ${loadingSurveys ? 'LOADING' : hasSurveys ? 'SURVEYS' : 'NO SURVEYS'}`);
                            }}
                          >
                            Render?
                          </div>
                          
                          {loadingSurveys ? (
                            <div className="flex items-center gap-1">
                              <Skeleton className="h-5 w-5 rounded" />
                              <Skeleton className="h-5 w-5 rounded" />
                            </div>
                          ) : surveyStatuses && surveyStatuses[member.contestantId]?.length > 0 ? (
                            <TooltipProvider>
                              {surveyStatuses[member.contestantId].map((survey) => {
                                let buttonColor = "bg-gray-200 hover:bg-gray-300";
                                let tooltipText = `${survey.name}: Not started (0/${survey.totalQuestions})`;
                                let label = `S${survey.id}`;
                                if (survey.status === "partial") {
                                  buttonColor = "bg-yellow-200 hover:bg-yellow-300";
                                  tooltipText = `${survey.name}: In progress (${survey.answeredQuestions}/${survey.totalQuestions})`;
                                } else if (survey.status === "completed") {
                                  buttonColor = "bg-green-200 hover:bg-green-300";
                                  tooltipText = `${survey.name}: Completed (${survey.answeredQuestions}/${survey.totalQuestions})`;
                                }
                                return (
                                  <Tooltip key={survey.id}>
                                    <TooltipTrigger asChild>
                                      <div className={`inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium cursor-pointer ${buttonColor}`} aria-label={`Survey status: ${tooltipText}`} >
                                        {label}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{tooltipText}</TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </TooltipProvider>
                          ) : (
                            <div className="inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100">
                              No surveys
                            </div>
                          )}  
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.contestant.ic}</TableCell>
                    <TableCell>{member.role || "Member"}</TableCell>
                    <TableCell>{formatDate(member.joinedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedMember(member);
                            setIsRemovingMember(true);
                          }}>
                            <Trash className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No team members yet</h3>
              <p className="mt-2 text-center text-muted-foreground max-w-xs">
                This team doesn't have any members assigned. Add contestants to the team to get started.
              </p>
              <Button className="mt-4" onClick={() => setIsAddingMember(true)} disabled={availableContestants.length === 0}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a contestant to team {team.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Contestant</label>
              <Select value={selectedContestantId} onValueChange={setSelectedContestantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contestant" />
                </SelectTrigger>
                <SelectContent>
                  {availableContestants.length > 0 ? (
                    availableContestants.map(contestant => (
                      <SelectItem key={contestant.id} value={contestant.id.toString()}>
                        {contestant.name} ({contestant.ic})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No available contestants</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {availableContestants.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  All contestants are already in this team or no contestants exist.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role (Optional)</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Leader">Leader</SelectItem>
                  <SelectItem value="Co-Leader">Co-Leader</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Specialist">Specialist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingMember(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedContestantId || availableContestants.length === 0}>
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={isRemovingMember} onOpenChange={setIsRemovingMember}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.contestant?.name} from this team?
              This action can be reversed by adding the contestant back to the team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsRemovingMember(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Actions */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default TeamDetailsDialog;
