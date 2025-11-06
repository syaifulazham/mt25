"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, FileQuestion, FileText, Image, Loader2, Plus, Search, ShieldAlert, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

// Evidence Document Viewer component
const EvidenceDocumentViewer = ({ documentPath }: { documentPath: string }) => {
  const fileExtension = documentPath.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
  
  return (
    <Dialog>
      <DialogTrigger className="flex items-center justify-center">
        {isPdf ? (
          <FileText className="h-5 w-5 text-blue-600 cursor-pointer hover:text-blue-800" />
        ) : isImage ? (
          <Image className="h-5 w-5 text-green-600 cursor-pointer hover:text-green-800" />
        ) : (
          <FileQuestion className="h-5 w-5 text-amber-600 cursor-pointer hover:text-amber-800" />
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Evidence Document</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(80vh-80px)]">
          {isPdf ? (
            <iframe 
              src={documentPath} 
              className="w-full h-[70vh]" 
              title="PDF Document"
            />
          ) : isImage ? (
            <img 
              src={documentPath} 
              alt="Evidence Document" 
              className="max-w-full max-h-[70vh] mx-auto"
            />
          ) : (
            <div className="p-4 text-center">
              <p>Unsupported document format. <a href={documentPath} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Click here to download</a></p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface Team {
  id: number;
  name: string;
  hashcode: string;
  description: string | null;
  status: string;
  createdAt: Date;
  evidence_doc: string | null;
  contest: {
    id: number;
    name: string;
  };
  _count: {
    members: number;
  };
  eventRegistrations?: Array<{
    id: number;
    event: {
      id: number;
      name: string;
      location: string | null;
    };
  }>;
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

interface Event {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
}

interface PaginatedTeamsListProps {
  teams: Team[];
  contingentId: number;
  isAdmin: boolean;
  onTeamsUpdate?: () => void;
  pageSize?: number;
}

export interface PaginatedTeamsListRef {
  openCreateDialog: () => void;
}

export const PaginatedTeamsList = forwardRef<PaginatedTeamsListRef, PaginatedTeamsListProps>(
  function PaginatedTeamsList({ teams, contingentId, isAdmin, onTeamsUpdate, pageSize = 5 }, ref) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeams, setFilteredTeams] = useState(teams);
  
  // Team creation state
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedContestId, setSelectedContestId] = useState<number | null>(null);
  const [maxMembers, setMaxMembers] = useState(4);
  
  // Member management state
  const [manageMembersDialogOpen, setManageMembersDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedContestantId, setSelectedContestantId] = useState<number | null>(null);
  const [contestantSearchTerm, setContestantSearchTerm] = useState('');
  const [contestantDropdownOpen, setContestantDropdownOpen] = useState(false);
  
  // Join event state
  const [joinEventDialogOpen, setJoinEventDialogOpen] = useState(false);
  const [selectedTeamForEvent, setSelectedTeamForEvent] = useState<Team | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isJoiningEvent, setIsJoiningEvent] = useState(false);
  
  // Fetch contests, contestants, and events
  useEffect(() => {
    if (isAdmin) {
      fetchContests();
      fetchContestants();
      fetchEvents();
    }
  }, [contingentId, isAdmin]);
  
  // Update filtered teams when search term changes
  useEffect(() => {
    const filtered = teams.filter(team => 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.hashcode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTeams(filtered);
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, teams]);
  
  const fetchContests = async () => {
    try {
      const response = await fetch('/api/contests?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setContests(data);
      }
    } catch (error) {
      console.error("Error fetching contests:", error);
    }
  };
  
  const fetchContestants = async () => {
    try {
      const response = await fetch(`/api/organizer/contingents/${contingentId}/contestants`);
      if (response.ok) {
        const data = await response.json();
        setContestants(data);
      }
    } catch (error) {
      console.error("Error fetching contestants:", error);
    }
  };
  
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };
  
  const fetchTeamMembers = async (teamId: number) => {
    try {
      setIsLoadingMembers(true);
      const response = await fetch(`/api/organizer/teams/${teamId}/members`);
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
        onTeamsUpdate?.();
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
    setContestantSearchTerm(''); // Reset search when opening
    setSelectedContestantId(null); // Reset selection
    setContestantDropdownOpen(false);
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
        setContestantSearchTerm('');
        setContestantDropdownOpen(false);
        fetchTeamMembers(selectedTeam.id); // Refresh members list in modal
        // Don't refresh page here - only when modal closes
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
        fetchTeamMembers(selectedTeam.id); // Refresh members list in modal
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };
  
  const handleOpenJoinEvent = (team: Team) => {
    setSelectedTeamForEvent(team);
    setSelectedEventId(null);
    setJoinEventDialogOpen(true);
  };
  
  const handleJoinEvent = async () => {
    if (!selectedTeamForEvent || !selectedEventId) {
      toast.error("Please select an event");
      return;
    }
    
    try {
      setIsJoiningEvent(true);
      const response = await fetch(`/api/organizer/teams/${selectedTeamForEvent.id}/join-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventId })
      });
      
      if (response.ok) {
        toast.success("Team joined event successfully");
        setJoinEventDialogOpen(false);
        onTeamsUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to join event");
      }
    } catch (error) {
      console.error("Error joining event:", error);
      toast.error("Failed to join event");
    } finally {
      setIsJoiningEvent(false);
    }
  };
  
  // Filter available contestants (not already in team)
  const availableContestants = contestants.filter(
    c => !teamMembers.some(tm => tm.contestantId === c.id)
  );
  
  // Further filter by search term (name or IC)
  const filteredAvailableContestants = availableContestants.filter(contestant => {
    if (!contestantSearchTerm) return true;
    const searchLower = contestantSearchTerm.toLowerCase();
    const nameMatch = contestant.name.toLowerCase().includes(searchLower);
    const icMatch = contestant.ic?.toLowerCase().includes(searchLower);
    return nameMatch || icMatch;
  });
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openCreateDialog: () => setCreateDialogOpen(true)
  }));
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredTeams.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTeams = filteredTeams.slice(startIndex, endIndex);
  
  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  return (
    <>
      {/* Search box */}
      <div className="mb-4 relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by team name or code"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredTeams.length > 0 ? (
        <>
          <div className="space-y-4">
            {currentTeams.map((team) => (
              <Card key={team.id} className="overflow-hidden border-l-4 border-l-blue-500">
                <CardHeader className="py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 bg-blue-100">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {team.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          <Badge 
                            variant="secondary"
                            className={`text-xs ${team.status === "ACTIVE" ? "bg-green-100 text-green-800" : team.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : ""}`}
                          >
                            {team.status}
                          </Badge>
                        </div>
                        {team.evidence_doc && (
                          <EvidenceDocumentViewer documentPath={team.evidence_doc} />
                        )}
                      </div>
                      <CardDescription className="flex flex-col gap-1">
                        <div>Code: {team.hashcode}</div>
                        <div>Members: {team._count.members}</div>
                        <div>Contest: {team.contest.name}</div>
                      </CardDescription>
                      
                      {/* Registered Events */}
                      {team.eventRegistrations && team.eventRegistrations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {team.eventRegistrations.map((reg) => (
                            <Badge key={reg.id} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              📅 {reg.event.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenManageMembers(team)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenJoinEvent(team)}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Join Event
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-6 border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredTeams.length)} of {filteredTeams.length} teams
              {searchTerm && teams.length !== filteredTeams.length && (
                <span className="ml-1">(filtered from {teams.length})</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToPreviousPage} 
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToNextPage} 
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Teams</h3>
          <p className="text-muted-foreground mb-4">
            This contingent doesn't have any teams yet.
          </p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          )}
        </div>
      )}
      
      {/* Create Team Dialog */}
      {isAdmin && (
        <>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team for this contingent
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
          <Dialog open={manageMembersDialogOpen} onOpenChange={(open) => {
            setManageMembersDialogOpen(open);
            if (!open) {
              // Refresh page when dialog is closed
              onTeamsUpdate?.();
            }
          }}>
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
                  
                  {/* Searchable Contestant Dropdown */}
                  <div className="flex gap-2 relative flex-1">
                    <div className="flex-1 relative">
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full justify-between"
                        onClick={() => setContestantDropdownOpen(!contestantDropdownOpen)}
                      >
                        {selectedContestantId
                          ? availableContestants.find((c) => c.id === selectedContestantId)?.name
                          : "Search and select contestant..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      
                      {contestantDropdownOpen && (
                        <>
                          {/* Backdrop */}
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setContestantDropdownOpen(false)}
                          />
                          
                          {/* Dropdown */}
                          <div className="absolute top-full left-0 mt-1 w-full md:w-[400px] z-50 rounded-md border bg-popover shadow-md">
                            <div className="flex flex-col">
                              {/* Search Input */}
                              <div className="flex items-center border-b px-3 bg-background">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <input
                                  type="text"
                                  placeholder="Search by name or IC..."
                                  value={contestantSearchTerm}
                                  onChange={(e) => setContestantSearchTerm(e.target.value)}
                                  autoFocus
                                  autoComplete="off"
                                  className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                />
                              </div>
                              
                              {/* Results List */}
                              <div className="max-h-[300px] overflow-y-auto p-1 bg-popover">
                                {filteredAvailableContestants.length > 0 ? (
                                  filteredAvailableContestants.map((contestant) => (
                                    <button
                                      key={contestant.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedContestantId(contestant.id);
                                        setContestantDropdownOpen(false);
                                      }}
                                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 shrink-0",
                                          selectedContestantId === contestant.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col items-start flex-1">
                                        <span className="font-medium">{contestant.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {contestant.edu_level}{contestant.ic && ` • ${contestant.ic}`}
                                        </span>
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="py-6 text-center text-sm text-muted-foreground">
                                    {availableContestants.length === 0 
                                      ? "No available contestants"
                                      : "No contestants found"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <Button onClick={handleAddMember} disabled={isAddingMember || !selectedContestantId}>
                      {isAddingMember ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Info text */}
                  <p className="text-xs text-muted-foreground">
                    {availableContestants.length} available contestant{availableContestants.length !== 1 ? 's' : ''}
                    {contestantSearchTerm && filteredAvailableContestants.length !== availableContestants.length && (
                      <> • {filteredAvailableContestants.length} matching</>
                    )}
                  </p>
                </div>

                {/* Current Members Section */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Current Members ({teamMembers.length})
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

          {/* Join Event Dialog */}
          <Dialog open={joinEventDialogOpen} onOpenChange={setJoinEventDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Join Event - {selectedTeamForEvent?.name}</DialogTitle>
                <DialogDescription>
                  Select an event for this team to participate in
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="event">Event</Label>
                  <Select
                    value={selectedEventId?.toString() || ""}
                    onValueChange={(value) => setSelectedEventId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.length > 0 ? (
                        events.map((event) => (
                          <SelectItem key={event.id} value={event.id.toString()}>
                            {event.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-events" disabled>
                          No events available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Current Registrations */}
                {selectedTeamForEvent?.eventRegistrations && selectedTeamForEvent.eventRegistrations.length > 0 && (
                  <div className="space-y-2">
                    <Label>Already Registered:</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeamForEvent.eventRegistrations.map((reg) => (
                        <Badge key={reg.id} variant="secondary" className="text-xs">
                          {reg.event.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setJoinEventDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleJoinEvent} disabled={isJoiningEvent || !selectedEventId}>
                  {isJoiningEvent && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Join Event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
});

PaginatedTeamsList.displayName = 'PaginatedTeamsList';
