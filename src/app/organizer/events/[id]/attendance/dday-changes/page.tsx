'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Users, UserCheck, Building2, User, Search, Plus, Loader2, Trash2, AlertTriangle, ArrowLeft, RefreshCw, ArrowRight } from 'lucide-react';
import Link from "next/link";
import TeamTransferModal from '@/components/team-transfer-modal';

// Types
interface Team {
  id: number;
  name: string;
  contestName: string;
  contingentName: string;
  stateName?: string;
  status: string;
  memberCount: number;
  maxMembers?: number;
}

interface TeamMember {
  id: number;
  name: string;
  ic: string;
  age: number;
  email?: string;
  classGrade?: string;
  eduLevel?: string;
}

interface AttendanceMember {
  id: number;
  contestantId: number;
  name: string;
  ic: string;
  attendanceStatus: string;
  attendanceDate?: string;
  attendanceTime?: string;
}



interface Manager {
  id: number;
  name: string;
  ic: string;
  email?: string;
  phoneNumber?: string;
  attendanceStatus?: string;
}

interface ContingentContestant {
  id: number;
  name: string;
  ic: string;
  age: number;
  email?: string;
  eduLevel: string;
  classGrade?: string;
  registrationStatus: 'REGISTERED' | 'AVAILABLE';
  teamName?: string;
  teamId?: number;
  contestName?: string;
  teamStatus?: string;
}

interface ContingentContestants {
  registered: ContingentContestant[];
  available: ContingentContestant[];
  total: number;
  registeredCount: number;
  availableCount: number;
}

export default function DdayChangesPage() {
  const { id: eventId } = useParams();
  const { toast } = useToast();

  // Search and selection states
  const [searchTerm, setSearchTerm] = useState('');
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Data states for the cards
  const [endlistMembers, setEndlistMembers] = useState<TeamMember[]>([]);
  const [attendanceMembers, setAttendanceMembers] = useState<AttendanceMember[]>([]);

  const [managers, setManagers] = useState<Manager[]>([]);
  const [contingentContestants, setContingentContestants] = useState<ContingentContestants | null>(null);

  // Loading states
  const [loadingEndlist, setLoadingEndlist] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingContingentContestants, setLoadingContingentContestants] = useState(false);
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const [removingMember, setRemovingMember] = useState<number | null>(null);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [teamSelectionModalOpen, setTeamSelectionModalOpen] = useState(false);
  const [addingMember, setAddingMember] = useState<number | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Fetch available teams on component mount
  useEffect(() => {
    fetchAvailableTeams();
  }, [eventId]);

  // Filter teams based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTeams(availableTeams);
    } else {
      const filtered = availableTeams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.contestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.contingentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, availableTeams]);

  // Fetch team data when a team is selected
  useEffect(() => {
    if (selectedTeam) {
      fetchTeamData(selectedTeam.id);
    } else {
      // Clear all data when no team is selected
      setEndlistMembers([]);
      setAttendanceMembers([]);

      setManagers([]);
      setContingentContestants(null);
    }
  }, [selectedTeam]);

  const fetchAvailableTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/dday-changes/teams`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      
      const data = await response.json();
      setAvailableTeams(data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchTeamData = async (teamId: number) => {
    // Fetch all data in parallel
    await Promise.all([
      fetchEndlistData(teamId),
      fetchAttendanceData(teamId),

      fetchManagersData(teamId),
      fetchContingentContestantsData(teamId)
    ]);
  };

  const fetchEndlistData = async (teamId: number) => {
    setLoadingEndlist(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/dday-changes/team/${teamId}/endlist`);
      if (!response.ok) throw new Error('Failed to fetch endlist data');
      
      const data = await response.json();
      setEndlistMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching endlist data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load endlist data',
        variant: 'destructive',
      });
    } finally {
      setLoadingEndlist(false);
    }
  };

  const fetchAttendanceData = async (teamId: number) => {
    setLoadingAttendance(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/dday-changes/team/${teamId}/attendance`);
      if (!response.ok) throw new Error('Failed to fetch attendance data');
      
      const data = await response.json();
      setAttendanceMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoadingAttendance(false);
    }
  };



  const fetchManagersData = async (teamId: number) => {
    setLoadingManagers(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/dday-changes/team/${teamId}/managers`);
      if (!response.ok) throw new Error('Failed to fetch managers data');
      
      const data = await response.json();
      setManagers(data.managers || []);
    } catch (error) {
      console.error('Error fetching managers data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load managers data',
        variant: 'destructive',
      });
    } finally {
      setLoadingManagers(false);
    }
  };

  const fetchContingentContestantsData = async (teamId: number) => {
    setLoadingContingentContestants(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/dday-changes/team/${teamId}/contingent-contestants`);
      if (!response.ok) throw new Error('Failed to fetch contingent contestants data');
      
      const data = await response.json();
      setContingentContestants(data.contestants || null);
    } catch (error) {
      console.error('Error fetching contingent contestants data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contingent contestants data',
        variant: 'destructive',
      });
    } finally {
      setLoadingContingentContestants(false);
    }
  };

  // Check if attendance records match endlist members
  const checkAttendanceSync = () => {
    if (endlistMembers.length === 0 || attendanceMembers.length === 0) {
      return endlistMembers.length !== attendanceMembers.length;
    }

    const endlistICs = new Set(endlistMembers.map(m => m.ic));
    const attendanceICs = new Set(attendanceMembers.map(a => a.ic));

    // Check if sets are equal
    if (endlistICs.size !== attendanceICs.size) return true;
    
    for (const ic of endlistICs) {
      if (!attendanceICs.has(ic)) return true;
    }
    
    return false;
  };

  const handleSyncAttendance = async () => {
    if (!selectedTeam) return;

    setSyncingAttendance(true);
    try {
      const response = await fetch(
        `/api/organizer/events/${eventId}/attendance/dday-changes/team/${selectedTeam.id}/sync-attendance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync attendance records');
      }

      const result = await response.json();
      
      toast({
        title: 'Sync Completed',
        description: result.message,
        variant: 'default',
      });

      // Refresh attendance data
      await fetchAttendanceData(selectedTeam.id);
      
    } catch (error) {
      console.error('Error syncing attendance:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync attendance records. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSyncingAttendance(false);
    }
  };

  const handleRemoveMember = async (contestantId: number, memberName: string) => {
    if (!selectedTeam) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove "${memberName}" from the team? This action cannot be undone.`
    );

    if (!confirmed) return;

    setRemovingMember(contestantId);
    try {
      const response = await fetch(
        `/api/organizer/events/${eventId}/attendance/dday-changes/team/${selectedTeam.id}/remove-member`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contestantId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      const result = await response.json();
      
      toast({
        title: 'Member Removed',
        description: `${memberName} has been removed from the team.`,
        variant: 'default',
      });

      // Refresh endlist and attendance data
      await Promise.all([
        fetchEndlistData(selectedTeam.id),
        fetchAttendanceData(selectedTeam.id)
      ]);
      
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: 'Remove Failed',
        description: 'Failed to remove team member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const handleAddMember = async (contestantId: number, contestantName: string) => {
    if (!selectedTeam) return;

    setAddingMember(contestantId);
    try {
      const response = await fetch(
        `/api/organizer/events/${eventId}/attendance/dday-changes/team/${selectedTeam.id}/add-member`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contestantId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add team member');
      }

      const result = await response.json();
      
      toast({
        title: 'Member Added',
        description: result.message,
        variant: 'default',
      });

      // Close modal and refresh data
      setAddMemberModalOpen(false);
      await Promise.all([
        fetchEndlistData(selectedTeam.id),
        fetchAttendanceData(selectedTeam.id),
        fetchContingentContestantsData(selectedTeam.id)
      ]);
      
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: 'Add Failed',
        description: error instanceof Error ? error.message : 'Failed to add team member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAddingMember(null);
    }
  };

  const handleTeamSelect = (teamId: string) => {
    const team = availableTeams.find(t => t.id === parseInt(teamId));
    if (team) {
      setSelectedTeam(team);
      setTeamSelectionModalOpen(false);
      
      // Fetch data for the selected team
      fetchTeamData(team.id);
      fetchEndlistData(team.id);
      fetchAttendanceData(team.id);
      fetchManagersData(team.id);
      fetchContingentContestantsData(team.id);
    }
  };

  const handleTransferComplete = () => {
    // Refresh the teams list and clear selection
    fetchAvailableTeams();
    setSelectedTeam(null);
    setEndlistMembers([]);
    setAttendanceMembers([]);
    setManagers([]);
    setContingentContestants(null);
    
    toast({
      title: "Transfer Complete",
      description: "Team has been successfully transferred to the new event.",
      variant: "default",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/organizer/events/${eventId}/attendance`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Attendance
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Manage D-Day Changes</h1>
            <p className="text-muted-foreground">Handle last-minute participant changes on event day</p>
          </div>
        </div>
      </div>

      {/* Team Search and Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Select Team
          </CardTitle>
          <CardDescription>
            Search and select a team to manage D-Day changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Dialog open={teamSelectionModalOpen} onOpenChange={setTeamSelectionModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto p-3 mt-1"
                  disabled={loadingTeams}
                >
                  {loadingTeams ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading teams...</span>
                    </div>
                  ) : selectedTeam ? (
                    <div className="space-y-1">
                      <div className="font-medium">{selectedTeam.name}</div>
                      <div className="text-sm text-gray-500">
                        Contest: {selectedTeam.contestName} | 
                        Contingent: {selectedTeam.contingentName}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {selectedTeam.memberCount} members
                        </Badge>
                        <Badge variant={selectedTeam.status === 'APPROVED' ? 'default' : 'secondary'} className="text-xs">
                          {selectedTeam.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Choose a team to manage attendance and members</div>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-none w-[98vw] h-[95vh] max-h-[95vh] overflow-hidden !p-6" style={{ width: '98vw', maxWidth: 'none' }}>
                <DialogHeader>
                  <DialogTitle>Select Team</DialogTitle>
                  <DialogDescription>
                    Choose a team to manage attendance and member changes
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by team name or contingent name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  {filteredTeams.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto">
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">State</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Contingent</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Team Name</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Contest</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Members</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredTeams.map((team) => (
                              <tr 
                                key={team.id} 
                                onClick={() => {
                                  handleTeamSelect(team.id.toString());
                                  setTeamSelectionModalOpen(false);
                                }}
                                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                                  selectedTeam?.id === team.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                }`}
                              >
                                <td className="px-4 py-3 text-sm text-gray-900">{team.stateName || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{team.contingentName}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{team.contestName}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{team.memberCount}</td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge variant={team.status === 'APPROVED' ? 'default' : 'secondary'}>
                                    {team.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No teams found matching your search</p>
                      <p className="text-sm">Try searching by team name or contingent name</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {selectedTeam && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Selected Team</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Team:</span> {selectedTeam.name}
                </div>
                <div>
                  <span className="font-medium">Contest:</span> {selectedTeam.contestName}
                </div>
                <div>
                  <span className="font-medium">Contingent:</span> {selectedTeam.contingentName}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <Badge variant={selectedTeam.status === 'APPROVED' ? 'default' : 'secondary'}>
                    {selectedTeam.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Three-Column Layout */}
      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Endlist and Attendance */}
          <div className="space-y-6">
            {/* Endlist Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Endlist Members
                  </div>
                  <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        disabled={!!(selectedTeam?.maxMembers && endlistMembers.length >= selectedTeam.maxMembers)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Select a contestant from the same contingent to add to this team
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {loadingContingentContestants ? (
                          <div className="text-center py-8">Loading available contestants...</div>
                        ) : contingentContestants?.available && contingentContestants.available.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground">
                              Available Contestants ({contingentContestants.available.length})
                            </h4>
                            {contingentContestants.available.map((contestant) => (
                              <div key={contestant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="font-medium">{contestant.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    IC: {contestant.ic} • Age: {contestant.age}
                                    {contestant.classGrade && ` • Grade ${contestant.classGrade}`}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {contestant.eduLevel}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddMember(contestant.id, contestant.name)}
                                  disabled={addingMember === contestant.id}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  {addingMember === contestant.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </>
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No available contestants from this contingent
                          </div>
                        )}
                      </div>
                     </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  Official team members from registration
                  {selectedTeam?.maxMembers && endlistMembers.length >= selectedTeam.maxMembers && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700 font-medium">
                        Maximum members reached ({endlistMembers.length}/{selectedTeam.maxMembers})
                      </span>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEndlist ? (
                  <div className="text-center py-4">Loading endlist data...</div>
                ) : endlistMembers.length > 0 ? (
                  <div className="space-y-3">
                    {endlistMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            IC: {member.ic} • Age: {member.age}
                            {member.classGrade && ` • ${member.classGrade}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Registered</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            disabled={removingMember === member.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {removingMember === member.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No endlist data available
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Column 2: Attendance Records */}
          <div className="space-y-6">
            {/* Attendance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Attendance Records
                  </div>
                  {!loadingEndlist && !loadingAttendance && checkAttendanceSync() && (
                    <Button
                      onClick={handleSyncAttendance}
                      disabled={syncingAttendance}
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      {syncingAttendance ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync
                        </>
                      )}
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Current attendance status for team members
                  {!loadingEndlist && !loadingAttendance && checkAttendanceSync() && (
                    <span className="block text-orange-600 font-medium mt-1">
                      ⚠️ Attendance records don't match endlist members
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAttendance ? (
                  <div className="text-center py-4">Loading attendance data...</div>
                ) : attendanceMembers.length > 0 ? (
                  <div className="space-y-3">
                    {attendanceMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            IC: {member.ic}
                            {member.attendanceDate && ` • Checked in: ${new Date(member.attendanceDate).toLocaleDateString()}`}
                          </div>
                        </div>
                        <Badge 
                          variant={member.attendanceStatus === 'Present' ? 'default' : 'secondary'}
                          className={member.attendanceStatus === 'Present' ? 'bg-green-500' : ''}
                        >
                          {member.attendanceStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No attendance records available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!selectedTeam && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Team Selected</h3>
          <p className="text-muted-foreground">
            Please search and select a team to view D-Day change management options
          </p>
        </div>
      )}

      {/* Team Transfer Modal */}
      {selectedTeam && (
        <TeamTransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          eventId={eventId as string}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          onTransferComplete={handleTransferComplete}
        />
      )}
    </div>
  );
}
