"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Users, Trash2, UserPlus, Loader2, Trophy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Team {
  id: number;
  name: string;
  hashcode: string;
  description: string | null;
  contestId: number;
  contestName: string;
  contingentId: number;
  status: string;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
}

interface Contest {
  id: number;
  name: string;
  code: string;
  maxMembersPerTeam: number;
}

interface Contestant {
  id: number;
  name: string;
  ic: string | null;
  gender: string | null;
  age: number | null;
  edu_level: string;
}

interface TeamMember {
  id: number;
  contestantId: number;
  contestant: Contestant;
  role: string | null;
}

interface TeamManagementPanelProps {
  contingentId: number;
  contingentName: string;
  isAdmin: boolean;
}

export function TeamManagementPanel({ contingentId, contingentName, isAdmin }: TeamManagementPanelProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create team modal
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedContestId, setSelectedContestId] = useState<number | null>(null);
  const [maxMembers, setMaxMembers] = useState(4);
  
  // Manage members modal
  const [manageMembersDialogOpen, setManageMembersDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedContestantId, setSelectedContestantId] = useState<number | null>(null);

  // Fetch teams
  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/organizer/contingents/${contingentId}/teams`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contests
  const fetchContests = async () => {
    try {
      const response = await fetch('/api/contests?isActive=true', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContests(data);
      }
    } catch (error) {
      console.error("Error fetching contests:", error);
    }
  };

  // Fetch contestants
  const fetchContestants = async () => {
    try {
      const response = await fetch(`/api/organizer/contingents/${contingentId}/contestants`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContestants(data);
      }
    } catch (error) {
      console.error("Error fetching contestants:", error);
    }
  };

  // Fetch team members
  const fetchTeamMembers = async (teamId: number) => {
    try {
      setIsLoadingMembers(true);
      const response = await fetch(`/api/organizer/teams/${teamId}/members`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTeams();
      fetchContests();
      fetchContestants();
    }
  }, [contingentId, isAdmin]);

  const handleCreateTeam = async () => {
    if (!newTeamName || !selectedContestId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch(`/api/organizer/contingents/${contingentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDescription,
          contestId: selectedContestId,
          maxMembers
        })
      });

      if (response.ok) {
        toast.success("Team created successfully");
        setCreateDialogOpen(false);
        setNewTeamName("");
        setNewTeamDescription("");
        setSelectedContestId(null);
        setMaxMembers(4);
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create team");
      }
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Failed to create team");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenManageMembers = (team: Team) => {
    setSelectedTeam(team);
    setManageMembersDialogOpen(true);
    fetchTeamMembers(team.id);
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedContestantId) {
      toast.error("Please select a contestant");
      return;
    }

    try {
      setIsAddingMember(true);
      const response = await fetch(`/api/organizer/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestantId: selectedContestantId })
      });

      if (response.ok) {
        toast.success("Member added successfully");
        setSelectedContestantId(null);
        fetchTeamMembers(selectedTeam.id);
        fetchTeams(); // Refresh team list to update member counts
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add member");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (teamMemberId: number) => {
    if (!selectedTeam) return;

    if (!confirm("Are you sure you want to remove this member from the team?")) {
      return;
    }

    try {
      const response = await fetch(`/api/organizer/teams/${selectedTeam.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberId })
      });

      if (response.ok) {
        toast.success("Member removed successfully");
        fetchTeamMembers(selectedTeam.id);
        fetchTeams(); // Refresh team list to update member counts
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  // Get available contestants (not already in the team)
  const availableContestants = contestants.filter(
    c => !teamMembers.some(tm => tm.contestantId === c.id)
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Team Management
              </CardTitle>
              <CardDescription>
                Create and manage teams for {contingentName}
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams created yet</p>
              <p className="text-sm">Click "Create Team" to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{team.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {team.hashcode}
                      </Badge>
                      <Badge variant={team.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {team.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {team.contestName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {team.memberCount} / {team.maxMembers} members
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenManageMembers(team)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Team Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team for {contingentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                placeholder="Enter team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contest">Contest *</Label>
              <Select
                value={selectedContestId?.toString() || ""}
                onValueChange={(value) => setSelectedContestId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contest" />
                </SelectTrigger>
                <SelectContent>
                  {contests.map((contest) => (
                    <SelectItem key={contest.id} value={contest.id.toString()}>
                      [{contest.code}] {contest.name} (Max {contest.maxMembersPerTeam} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMembers">Maximum Members</Label>
              <Input
                id="maxMembers"
                type="number"
                min={1}
                max={10}
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter team description"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={manageMembersDialogOpen} onOpenChange={setManageMembersDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Team Members - {selectedTeam?.name}</DialogTitle>
            <DialogDescription>
              Add or remove members from this team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add Member Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Add New Member</h4>
              <div className="flex gap-2">
                <Select
                  value={selectedContestantId?.toString() || ""}
                  onValueChange={(value) => setSelectedContestantId(parseInt(value))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a contestant" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContestants.map((contestant) => (
                      <SelectItem key={contestant.id} value={contestant.id.toString()}>
                        {contestant.name} ({contestant.edu_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddMember} disabled={isAddingMember || !selectedContestantId}>
                  {isAddingMember ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Current Members Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Current Members ({teamMembers.length} / {selectedTeam?.maxMembers})
              </h4>
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No members yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Education Level</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.contestant.name}
                        </TableCell>
                        <TableCell>{member.contestant.edu_level}</TableCell>
                        <TableCell>{member.contestant.gender || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageMembersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
