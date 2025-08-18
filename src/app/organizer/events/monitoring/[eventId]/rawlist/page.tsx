"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Download, 
  ChevronLeft,
  ChevronDown,
  Users,
  GraduationCap,
  School,
  FileSpreadsheet
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/page-header";

interface TeamMember {
  id: number;
  participantName: string;
  email: string;
  ic: string;
  edu_level: string | null;
  class_grade: string | null;
  age: number | null;
  joinedAt: string | null;
  formattedClassGrade: string;
  isDuplicate?: boolean;
  duplicateTeams?: string[];
}

interface Team {
  id: number;
  teamName: string;
  contestName: string;
  status: string;
  registrationDate: string;
  contingentName: string;
  contingentType: string;
  schoolLevel: string;
  targetGroupLabel: string;
  stateName: string;
  minAge: number;
  maxAge: number;
  members: TeamMember[];
  hasDuplicateMembers?: boolean;
}

export default function RawlistPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetGroupFilter, setTargetGroupFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  // Column width management
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    record: 80,
    teamName: 200,
    status: 120,
    targetGroup: 100,
    state: 120,
    contingent: 150,
    registrationDate: 140,
    actions: 120,
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    teamId: number | null;
    teamName: string;
    newStatus: string;
  }>({ isOpen: false, teamId: null, teamName: '', newStatus: '' });

  // Helper function to format joinedAt date in Malaysia timezone (GMT+8)
  const formatJoinedAt = (joinedAt: string | null) => {
    if (!joinedAt) return null;
    try {
      const date = new Date(joinedAt);
      // Add 8 hours for Malaysia timezone (GMT+8)
      const malaysiaDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      return format(malaysiaDate, "dd/MM/yyyy HH:mm");
    } catch (error) {
      return null;
    }
  };

  // Helper function to get icon for target group
  const getTargetGroupIcon = (targetGroupLabel: string) => {
    switch (targetGroupLabel.toLowerCase()) {
      case 'kids':
        return <School className="h-4 w-4 text-blue-500" />;
      case 'teens':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'youth':
        return <GraduationCap className="h-4 w-4 text-purple-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  // Helper function to check if team has age mismatches
  const hasAgeMismatch = (team: Team) => {
    if (!team.minAge || !team.maxAge) return false;
    
    return team.members.some(member => {
      if (!member.age || isNaN(member.age)) return true; // Invalid age data
      return member.age < team.minAge || member.age > team.maxAge;
    });
  };

  // Helper function to get age mismatch details
  const getAgeMismatchDetails = (team: Team) => {
    if (!team.minAge || !team.maxAge) return null;
    
    const mismatchedMembers = team.members.filter(member => {
      if (!member.age || isNaN(member.age)) return true;
      return member.age < team.minAge || member.age > team.maxAge;
    });
    
    if (mismatchedMembers.length === 0) return null;
    
    const invalidAgeMembers = mismatchedMembers.filter(m => !m.age || isNaN(m.age));
    const tooYoungMembers = mismatchedMembers.filter(m => m.age && !isNaN(m.age) && m.age < team.minAge);
    const tooOldMembers = mismatchedMembers.filter(m => m.age && !isNaN(m.age) && m.age > team.maxAge);
    
    const details = [];
    if (invalidAgeMembers.length > 0) {
      details.push(`${invalidAgeMembers.length} member(s) with invalid age data`);
    }
    if (tooYoungMembers.length > 0) {
      details.push(`${tooYoungMembers.length} member(s) too young (< ${team.minAge})`);
    }
    if (tooOldMembers.length > 0) {
      details.push(`${tooOldMembers.length} member(s) too old (> ${team.maxAge})`);
    }
    
    return details.join(', ');
  };

  // Fetch teams data
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizer/events/${eventId}/rawlist`);
      if (!response.ok) {
        throw new Error("Failed to fetch teams");
      }
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Filter teams based on search and filters
  useEffect(() => {
    let filtered = teams;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(team =>
        team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.contingentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.stateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.members.some(member => 
          member.participantName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(team => team.status === statusFilter);
    }

    // Target group filter
    if (targetGroupFilter !== "all") {
      filtered = filtered.filter(team => team.targetGroupLabel === targetGroupFilter);
    }

    // State filter
    if (stateFilter !== "all") {
      filtered = filtered.filter(team => team.stateName === stateFilter);
    }

    setFilteredTeams(filtered);
  }, [teams, searchTerm, statusFilter, targetGroupFilter, stateFilter]);

  // Get unique values for filters
  const uniqueStatuses = [...new Set(teams.map(team => team.status))];
  const uniqueTargetGroups = [...new Set(teams.map(team => team.targetGroupLabel))];
  const uniqueStates = [...new Set(teams.map(team => team.stateName))];

  // Column resizing functions
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    setIsResizing(columnKey);
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey];
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle team expansion
  const toggleTeamExpansion = (teamId: number) => {
    const newExpandedTeams = new Set(expandedTeams);
    if (newExpandedTeams.has(teamId)) {
      newExpandedTeams.delete(teamId);
    } else {
      newExpandedTeams.add(teamId);
    }
    setExpandedTeams(newExpandedTeams);
  };

  const handleStatusChange = (teamId: number, teamName: string, newStatus: string) => {
    setConfirmationModal({
      isOpen: true,
      teamId,
      teamName,
      newStatus
    });
  };

  const confirmStatusChange = async () => {
    if (!confirmationModal.teamId || !confirmationModal.newStatus) return;

    try {
      const response = await fetch(`/api/organizer/events/${eventId}/endlist/${confirmationModal.teamId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: confirmationModal.newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update team status');
      }

      // Refresh the teams data
      await fetchTeams();
      
      // Close modal
      setConfirmationModal({ isOpen: false, teamId: null, teamName: '', newStatus: '' });
    } catch (error) {
      console.error('Error updating team status:', error);
      alert('Failed to update team status. Please try again.');
    }
  };

  const handleGenerateDocx = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/rawlist/docx`);
      if (!response.ok) {
        throw new Error('Failed to generate DOCX');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `rawlist-event-${eventId}-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert('Failed to generate DOCX file. Please try again.');
    }
  };

  const handleGenerateXlsx = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/rawlist/xlsx`);
      if (!response.ok) {
        throw new Error('Failed to generate XLSX');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `rawlist-event-${eventId}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating XLSX:', error);
      alert('Failed to generate XLSX file. Please try again.');
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <PageHeader
          title="Raw Team List"
          description="Complete list of all registered teams (unfiltered)"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading teams...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/organizer/events/monitoring")}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Monitoring
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Raw Team List</h1>
              <p className="text-muted-foreground">
                Complete unfiltered list of all registered teams
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/monitoring/${eventId}/endlist`)}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              View End List
            </Button>
            <Button onClick={handleGenerateDocx} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Generate DOCX
            </Button>
            <Button onClick={handleGenerateXlsx} className="flex items-center gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4" />
              XLSX
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Teams ({filteredTeams.length})</span>
              <Badge variant="secondary" className="text-sm">
                Total: {teams.length} teams
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search teams, contingents, states, or members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={targetGroupFilter} onValueChange={setTargetGroupFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by target group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Target Groups</SelectItem>
                    {uniqueTargetGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Teams Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full table-fixed">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      { key: 'record', label: 'Record' },
                      { key: 'teamName', label: 'Team Name' },
                      { key: 'status', label: 'Status' },
                      { key: 'targetGroup', label: 'Target Group' },
                      { key: 'state', label: 'State' },
                      { key: 'contingent', label: 'Contingent' },
                      { key: 'registrationDate', label: 'Registration Date' },
                      { key: 'actions', label: 'Actions' }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className="text-left font-medium text-muted-foreground px-4 py-3 border-r border-border last:border-r-0 relative group"
                        style={{ width: columnWidths[column.key] + 'px' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{column.label}</span>
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-border bg-transparent transition-colors"
                            onMouseDown={(e) => handleMouseDown(e, column.key)}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team, index) => (
                    <React.Fragment key={team.id}>
                      <tr 
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td 
                          className="px-4 py-3 text-sm font-medium"
                          style={{ width: columnWidths.record + 'px' }}
                        >
                          <div className="truncate">{index + 1}</div>
                        </td>
                        <td 
                          className="px-4 py-3 text-sm font-medium"
                          style={{ width: columnWidths.teamName + 'px' }}
                        >
                          <div className="flex flex-col">
                            <button 
                              onClick={() => toggleTeamExpansion(team.id)}
                              className="text-left hover:text-primary transition-colors w-full"
                            >
                              <div className="flex flex-col">
                                <span className="truncate font-medium">{team.teamName}</span>
                                <span className="text-xs text-muted-foreground truncate">{team.contestName}</span>
                              </div>
                            </button>
                            {hasAgeMismatch(team) && (
                              <div className="text-xs text-red-600 mt-1 font-normal">
                                ⚠️ Age mismatch: {getAgeMismatchDetails(team)}
                              </div>
                            )}
                            {team.hasDuplicateMembers && (
                              <div className="text-xs text-orange-600 mt-1 font-normal flex items-center gap-1">
                                🚨 Duplicate members: Some members belong to multiple teams
                              </div>
                            )}
                            {team.members.length === 0 && (
                              <div className="text-xs text-red-600 mt-1 font-normal flex items-center gap-1">
                                ❌ Empty team: No members registered
                              </div>
                            )}
                          </div>
                        </td>
                        <td 
                          className="px-4 py-3 text-sm"
                          style={{ width: columnWidths.status + 'px' }}
                        >
                          <Badge 
                            variant={
                              hasAgeMismatch(team) ? 'destructive' :
                              team.status === 'APPROVED' ? 'default' :
                              team.status === 'ACCEPTED' ? 'default' :
                              team.status === 'APPROVED_SPECIAL' ? 'outline' :
                              team.status === 'PENDING' ? 'secondary' :
                              'destructive'
                            }
                            className={`truncate text-xs ${
                              hasAgeMismatch(team) ? 'bg-red-100 text-red-800 border-red-300' :
                              team.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              team.status === 'ACCEPTED' ? 'bg-green-100 text-green-800 border-green-300' :
                              ''
                            }`}
                          >
                            {team.status}
                          </Badge>
                        </td>
                        <td 
                          className="px-4 py-3 text-sm"
                          style={{ width: columnWidths.targetGroup + 'px' }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {getTargetGroupIcon(team.targetGroupLabel)}
                            <span className="truncate">{team.targetGroupLabel}</span>
                          </div>
                        </td>
                        <td 
                          className="px-4 py-3 text-sm"
                          style={{ width: columnWidths.state + 'px' }}
                        >
                          <div className="truncate">{team.stateName}</div>
                        </td>
                        <td 
                          className="px-4 py-3 text-sm"
                          style={{ width: columnWidths.contingent + 'px' }}
                        >
                          <div className="truncate">{team.contingentName}</div>
                        </td>
                        <td 
                          className="px-4 py-3 text-xs text-muted-foreground"
                          style={{ width: columnWidths.registrationDate + 'px' }}
                        >
                          <div className="truncate">
                            {format(new Date(team.registrationDate), "dd/MM/yyyy")}
                          </div>
                        </td>
                        <td 
                          className="px-4 py-3"
                          style={{ width: columnWidths.actions + 'px' }}
                        >
                          <div className="flex items-center justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 px-2"
                                >
                                  Change Status
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(team.id, team.teamName, 'PENDING')}
                                  className="text-xs"
                                >
                                  Set to PENDING
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(team.id, team.teamName, 'CONDITIONAL')}
                                  className="text-xs"
                                >
                                  Set to CONDITIONAL
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(team.id, team.teamName, 'APPROVED')}
                                  className="text-xs"
                                >
                                  Set to APPROVED
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(team.id, team.teamName, 'APPROVED_SPECIAL')}
                                  className="text-xs"
                                >
                                  Set to APPROVED_SPECIAL
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Member Sub-Table - Only show when expanded */}
                      {expandedTeams.has(team.id) && (
                        <tr>
                          <td 
                            colSpan={9} 
                            className="px-0 py-0 bg-muted/10"
                          >
                            <div className="p-4">
                              <h4 className="font-medium text-sm mb-3 text-muted-foreground">
                                Team Members ({team.members.length})
                              </h4>
                              <div className="overflow-x-auto bg-yellow-50 border rounded-md">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-yellow-100">
                                      <th className="text-left p-2 font-medium text-muted-foreground">#</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">IC</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Class/Grade</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Age</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {team.members.map((member, memberIndex) => (
                                      <tr key={member.id} className="border-b last:border-b-0 hover:bg-yellow-100">
                                        <td className="p-2">{memberIndex + 1}</td>
                                        <td className="p-2">
                                          <div className="font-medium">{member.participantName}</div>
                                          {formatJoinedAt(member.joinedAt) && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              Joined: {formatJoinedAt(member.joinedAt)}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2 text-muted-foreground">{member.ic || 'N/A'}</td>
                                        <td className="p-2">{member.formattedClassGrade}</td>
                                        <td className="p-2">{member.age || 'N/A'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {filteredTeams.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No teams found matching your search criteria.
                </div>
              )}
            </div>
            
            {/* Column resize cursor styling */}
            <style jsx>{`
              .cursor-col-resize:hover {
                cursor: col-resize;
              }
              
              .cursor-col-resize:active {
                cursor: col-resize;
              }
            `}</style>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Status Change</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to set the status of team <strong>"{confirmationModal.teamName}"</strong> to <strong>{confirmationModal.newStatus}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmationModal({ isOpen: false, teamId: null, teamName: '', newStatus: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmStatusChange}
              >
                Update Status
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
