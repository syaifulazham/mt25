"use client";

import React, { useState } from 'react';
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
  Eye
} from "lucide-react";
import { useContingent } from './contingent-context';
import TeamForm from './team-form';
import TeamDetailsDialog from './team-details';

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
                      <TableCell>{renderStatusBadge(team.status)}</TableCell>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewTeamDetails(team)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                              <FileEdit className="h-4 w-4 mr-2" />
                              Edit Team
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTeam(team)}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Team
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewTeamDetails(team)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Manage Members
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
