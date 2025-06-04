"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { 
  Input 
} from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  MoreHorizontal, 
  Search, 
  UsersRound,
  Trash,
  FileEdit,
  UserCog,
  RefreshCw,
  PlusCircle,
  Users,
  Eye,
  ClipboardCheck,
  AlertCircle,
  Clipboard
} from "lucide-react";
import { useContingent } from './contingent-context';
import TeamForm from './team-form';
import TeamDetailsDialog from './team-details';

interface SurveyStatus {
  id: number;
  name: string;
  status: 'not_started' | 'partial' | 'completed';
  totalQuestions: number;
  answeredQuestions: number;
}

interface TeamSurveyStatus {
  teamId: number;
  surveys: Record<number, number>; // Map of surveyId to completion percentage (0-100)
}

export interface TeamsListProps {
  contingentId: number;
}

const TeamsList: React.FC<TeamsListProps> = ({ contingentId }) => {
  const { contingent, teams, isLoading, refreshTeams } = useContingent();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [activeSurveys, setActiveSurveys] = useState<any[]>([]);
  const [teamSurveyStatus, setTeamSurveyStatus] = useState<Record<number, Record<number, { completed: number, total: number }>>>({});
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [teamMenuStates, setTeamMenuStates] = useState<Record<number, boolean>>({}); // Track open/closed state for each team's menu
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Filter teams by search term
  const filteredTeams = teams.filter((team) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      team.name.toLowerCase().includes(searchLower) ||
      team.hashcode?.toLowerCase().includes(searchLower) ||
      (team.contestName && team.contestName.toLowerCase().includes(searchLower))
    );
  });

  // Handle edit team
  const handleEditTeam = (team: any) => {
    setSelectedTeam(team);
    setIsEditing(true);
  };

  // Handle delete team
  const handleDeleteTeam = (team: any) => {
    setSelectedTeam(team);
    setIsDeleting(true);
  };

  // Handle viewing team details
  const handleViewTeamDetails = (team: any) => {
    setSelectedTeam(team);
    setIsViewingDetails(true);
  };

  // Handle adding a new team
  const handleAddTeam = () => {
    setSelectedTeam(null);
    setIsAddingNew(true);
  };

  // Fetch active surveys
  const fetchActiveSurveys = async () => {
    try {
      // Try the diagnostic endpoint first
      const debugResponse = await fetch('/api/survey-debug');
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('Survey debug data:', debugData);
      }

      // Directly fetch all surveys and filter on client side
      const response = await fetch('/api/survey');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch surveys: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('All surveys from API:', data);
      
      // Check if surveys have the status field
      if (data.length > 0 && data[0].status === undefined) {
        console.error('Surveys are missing status field. API might need updating.');
      }
      
      const active = data.filter((survey: any) => survey.status === 'active');
      console.log('Filtered active surveys:', active);
      
      // Set active surveys even if empty, to update UI state
      setActiveSurveys(active);
      return active;
    } catch (error) {
      console.error("Error fetching active surveys:", error);
      return [];
    }
  };

  // Fetch survey completion for a team
  const fetchTeamSurveyStatus = async (teamId: number) => {
    try {
      const response = await fetch(`/api/organizer/teams/${teamId}/members`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch team members: ${response.status}`);
      }
      
      const teamMembers = await response.json();
      console.log(`Team ${teamId} members:`, teamMembers);
      
      if (teamMembers.length === 0) {
        return {};
      }
      
      // Initialize survey status for all active surveys
      const surveyStatus: Record<number, { completed: number, total: number }> = {};
      activeSurveys.forEach(survey => {
        surveyStatus[survey.id] = { completed: 0, total: 0 };
      });
      
      // For each member, get survey completion status
      for (const member of teamMembers) {
        const contestantId = member.contestantId;
        console.log(`Fetching survey status for contestant ${contestantId}`);
        
        try {
          const response = await fetch(`/api/survey-status/contestant?contestantId=${contestantId}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Contestant ${contestantId} survey data:`, data);
            const surveys = data.surveys || [];
            
            // For each active survey, update the completion count
            activeSurveys.forEach(activeSurvey => {
              // Find this survey in the contestant's responses
              const contestantSurvey = surveys.find((s: any) => s.id === activeSurvey.id);
              
              // Initialize if not exists
              if (!surveyStatus[activeSurvey.id]) {
                surveyStatus[activeSurvey.id] = { completed: 0, total: 0 };
              }
              
              // Always increment total for this member
              surveyStatus[activeSurvey.id].total += 1;
              
              // Increment completed count if the contestant completed this survey
              if (contestantSurvey && contestantSurvey.status === 'completed') {
                surveyStatus[activeSurvey.id].completed += 1;
              }
            });
          }
        } catch (error) {
          console.error(`Error getting survey status for contestant ${contestantId}:`, error);
        }
      }
      
      console.log(`Team ${teamId} survey status:`, surveyStatus);
      return surveyStatus;
    } catch (error) {
      console.error(`Error fetching survey status for team ${teamId}:`, error);
      return {};
    }
  };

  // Fetch all teams' survey status
  const fetchAllTeamsSurveyStatus = async () => {
    if (!teams.length || !activeSurveys.length) return;
    
    try {
      setLoadingSurveys(true);
      const statusMap: Record<number, Record<number, { completed: number, total: number }>> = {};
      
      await Promise.all(teams.map(async (team) => {
        const status = await fetchTeamSurveyStatus(team.id);
        statusMap[team.id] = status;
      }));
      
      setTeamSurveyStatus(statusMap);
    } catch (error) {
      console.error("Error fetching teams survey status:", error);
    } finally {
      setLoadingSurveys(false);
    }
  };

  // Initial data load on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('Initial loading of data...');
      await refreshTeams();
      const surveys = await fetchActiveSurveys();
      console.log('Initial load complete, teams:', teams.length, 'active surveys:', surveys.length);
    };
    
    loadInitialData();
  }, []);
  
  // Handle refreshes when editing is complete
  useEffect(() => {
    if (!isEditing && !isAddingNew) {
      refreshTeams();
      fetchActiveSurveys();
    }
  }, [isEditing, isAddingNew]);
  
  // Fetch survey status when teams or active surveys change
  useEffect(() => {
    console.log('Effect triggered - teams:', teams.length, 'active surveys:', activeSurveys.length);
    if (teams.length > 0 && activeSurveys.length > 0) {
      console.log('Fetching all team survey statuses for', teams.length, 'teams');
      fetchAllTeamsSurveyStatus();
    }
  }, [teams, activeSurveys]);

  // Handle form completion
  const handleFormComplete = () => {
    setIsEditing(false);
    setIsAddingNew(false);
    refreshTeams();
    toast.success(isEditing ? "Team updated successfully" : "Team added successfully");
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedTeam) return;
    
    try {
      const response = await fetch(`/api/organizer/teams/${selectedTeam.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete team: ${response.status}`);
      }
      
      toast.success("Team deleted successfully");
      refreshTeams();
    } catch (err) {
      console.error("Error deleting team:", err);
      toast.error("Failed to delete team");
    } finally {
      setIsDeleting(false);
      setSelectedTeam(null);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  // Display status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">{status}</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">{status}</Badge>;
      case 'PENDING':
        return <Badge variant="outline">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Teams</CardTitle>
              <CardDescription>
                Manage competition teams for {contingent?.name || 'this contingent'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTeam}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshTeams}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Teams Table */}
          {filteredTeams.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Contest</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Surveys</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.contestName || 'N/A'}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                          {team.hashcode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{team.memberCount || 0}</span>
                          <span className="text-muted-foreground">/</span>
                          <span>{team.maxMembers}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {loadingSurveys ? (
                            <div className="flex items-center gap-1">
                              <div className="h-6 w-6 rounded-full bg-slate-200 animate-pulse"></div>
                            </div>
                          ) : activeSurveys.length > 0 ? (
                            <TooltipProvider>
                              {activeSurveys.map((survey) => {
                                const status = teamSurveyStatus[team.id]?.[survey.id];
                                
                                if (!status) return null;
                                
                                // Calculate completion percentage
                                const completionPercent = status.total > 0 
                                  ? Math.round((status.completed / status.total) * 100) 
                                  : 0;
                                
                                // Determine button color based on completion
                                let buttonColor = "bg-gray-200 hover:bg-gray-300"; // no members completed
                                let tooltipText = `${survey.name}: No members completed (0%)`;  
                                let icon = <AlertCircle className="h-3 w-3 text-gray-600" />;
                                
                                if (completionPercent > 0 && completionPercent < 100) {
                                  buttonColor = "bg-yellow-200 hover:bg-yellow-300"; // partial completion
                                  tooltipText = `${survey.name}: ${status.completed}/${status.total} members completed (${completionPercent}%)`;
                                  icon = <Clipboard className="h-3 w-3 text-yellow-600" />;
                                } else if (completionPercent === 100) {
                                  buttonColor = "bg-green-200 hover:bg-green-300"; // all completed
                                  tooltipText = `${survey.name}: All members completed (${status.completed}/${status.total})`;
                                  icon = <ClipboardCheck className="h-3 w-3 text-green-600" />;
                                }
                                
                                return (
                                  <Tooltip key={survey.id}>
                                    <TooltipTrigger>
                                      <div 
                                        className={`inline-flex items-center justify-center rounded-md border p-1 h-6 w-6 text-sm cursor-pointer ${buttonColor}`}
                                      >
                                        {icon}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{tooltipText}</TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">No active surveys</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{renderStatusBadge(team.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="relative inline-block text-left">
                          <div>
                            <div 
                              onClick={() => {
                                const newTeamMenuStates = {...teamMenuStates};
                                newTeamMenuStates[team.id] = !teamMenuStates[team.id];
                                setTeamMenuStates(newTeamMenuStates);
                              }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-secondary cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </div>
                          </div>
                          {teamMenuStates[team.id] && (
                            <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                 role="menu"
                                 aria-orientation="vertical"
                                 aria-labelledby="menu-button">
                              <div className="py-1" role="none">
                                <div className="px-3 py-2 text-xs font-medium text-gray-500">Actions</div>
                                <div className="h-px bg-gray-200 my-1"></div>
                                
                                <div 
                                  onClick={() => {
                                    handleViewTeamDetails(team);
                                    const newTeamMenuStates = {...teamMenuStates};
                                    newTeamMenuStates[team.id] = false;
                                    setTeamMenuStates(newTeamMenuStates);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </div>
                                
                                <div 
                                  onClick={() => {
                                    handleEditTeam(team);
                                    const newTeamMenuStates = {...teamMenuStates};
                                    newTeamMenuStates[team.id] = false;
                                    setTeamMenuStates(newTeamMenuStates);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <FileEdit className="h-4 w-4 mr-2" />
                                  Edit Team
                                </div>
                                
                                <div 
                                  onClick={() => {
                                    handleDeleteTeam(team);
                                    const newTeamMenuStates = {...teamMenuStates};
                                    newTeamMenuStates[team.id] = false;
                                    setTeamMenuStates(newTeamMenuStates);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete Team
                                </div>
                                
                                <div className="h-px bg-gray-200 my-1"></div>
                                
                                <div 
                                  onClick={() => {
                                    handleViewTeamDetails(team);
                                    const newTeamMenuStates = {...teamMenuStates};
                                    newTeamMenuStates[team.id] = false;
                                    setTeamMenuStates(newTeamMenuStates);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Manage Members
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 border rounded-md">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <UsersRound className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No teams found</h3>
              <p className="mt-2 text-center text-muted-foreground max-w-xs">
                {searchTerm ? 'No teams match your search criteria.' : 'This contingent has no teams yet.'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={handleAddTeam}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create a team
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Team Dialog */}
      <Dialog open={isEditing || isAddingNew} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setIsAddingNew(false);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Team' : 'Create New Team'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? `Update details for team ${selectedTeam?.name}`
                : `Create a new team for ${contingent?.name || 'this contingent'}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <TeamForm 
            team={selectedTeam}
            contingentId={contingentId}
            onComplete={handleFormComplete}
          />
        </DialogContent>
      </Dialog>

      {/* Team Details Dialog */}
      <Dialog open={isViewingDetails} onOpenChange={(open) => {
        if (!open) setIsViewingDetails(false);
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Team Details
            </DialogTitle>
            <DialogDescription>
              View and manage team members
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeam && (
            <TeamDetailsDialog 
              team={selectedTeam}
              onClose={() => setIsViewingDetails(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team
              &quot;{selectedTeam?.name}&quot; and remove all member assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleting(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const LoadingState = () => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex justify-between mb-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="border rounded-md">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between items-center py-4">
              {[1, 2, 3, 4, 5, 6].map(j => (
                <Skeleton key={j} className="h-4 w-20" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default TeamsList;
