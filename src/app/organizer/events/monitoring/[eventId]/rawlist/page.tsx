"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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
  FileSpreadsheet,
  FileText,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
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
  teamEmail?: string;
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
  
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadInProgress, setDownloadInProgress] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [showDiagnosticDialog, setShowDiagnosticDialog] = useState(false);

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

  // Helper function to validate email format using the exact same regex as the backend
  const isValidEmail = (email: string | null | undefined): boolean => {
    if (!email || email.trim() === '') return false;
    // This must match exactly the backend regex in approved-xlsx/route.ts
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Count pending teams that meet approval criteria
  useEffect(() => {
    console.log('==== DEBUGGING TEAM ELIGIBILITY ====');
    console.log(`Total teams: ${teams.length}`);
    
    // First log all PENDING teams with their details
    const pendingTeams = teams.filter(team => team.status === 'PENDING');
    console.log(`PENDING teams count: ${pendingTeams.length}`);
    
    // Create an exhaustive debug report for each team
    let eligibleCount = 0;
    let ineligibleEmailCount = 0;
    let ineligibleEmptyTeamCount = 0;
    let ineligibleDuplicatesCount = 0;
    let ineligibleAgeMismatchCount = 0;
    
    const eligiblePendingTeams = teams.filter(team => {
      if (team.status !== 'PENDING') return false;
      
      // Analyze why a team might be ineligible
      let eligibleReasons = [];
      let ineligibleReasons = [];
      
      // 1. PENDING status
      eligibleReasons.push('Status is PENDING');
      
      // 2. Must have at least one member
      if (team.members.length > 0) {
        eligibleReasons.push(`Has ${team.members.length} members`);
      } else {
        ineligibleReasons.push('No members');
        ineligibleEmptyTeamCount++;
      }
      
      // 3. No age mismatches with target group
      const ageIssue = hasAgeMismatch(team);
      if (!ageIssue) {
        eligibleReasons.push('Ages match target group');
      } else {
        ineligibleReasons.push(`Age mismatch: ${getAgeMismatchDetails(team)}`);
        ineligibleAgeMismatchCount++;
      }
      
      // 4. No duplicate members across ANY teams
      if (!team.hasDuplicateMembers) {
        eligibleReasons.push('No duplicate members');
      } else {
        // Find which members are duplicates
        const duplicateMembers = team.members.filter(m => m.isDuplicate);
        const duplicateMemberNames = duplicateMembers.map(m => m.participantName).join(', ');
        ineligibleReasons.push(`Has duplicate members: ${duplicateMemberNames}`);
        ineligibleDuplicatesCount++;
      }
      
      // 5. Email must be valid and follow regex pattern
      // Check email strictly using same regex as backend
      const validEmailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const validEmail = team.teamEmail && 
                        team.teamEmail.trim() !== '' && 
                        validEmailRegex.test(team.teamEmail);
      
      if (validEmail) {
        eligibleReasons.push(`Valid email: ${team.teamEmail}`);
      } else {
        ineligibleReasons.push(`Invalid email: '${team.teamEmail || 'missing'}'`);
        ineligibleEmailCount++;
      }
      
      // Final eligibility determination
      const eligible = 
        team.status === 'PENDING' && 
        team.members.length > 0 && 
        !hasAgeMismatch(team) && 
        !team.hasDuplicateMembers &&
        validEmail;
      
      // Detailed console logging with color formatting
      console.log(
        `%cTeam %c${team.teamName}%c (ID: ${team.id}): %c${eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`,
        'color: black;',
        'color: blue; font-weight: bold;',
        'color: black;',
        `color: ${eligible ? 'green' : 'red'}; font-weight: bold;`
      );
      
      if (eligibleReasons.length > 0) {
        console.log('  %c✓ PASS:%c ' + eligibleReasons.join(', '), 'color: green; font-weight: bold;', 'color: green;');
      }
      
      if (ineligibleReasons.length > 0) {
        console.log('  %c✗ FAIL:%c ' + ineligibleReasons.join(', '), 'color: red; font-weight: bold;', 'color: red;');
      }
      
      if (eligible) {
        eligibleCount++;
      }
      
      return eligible;
    });
    
    // Summary report
    console.log('==== ELIGIBILITY SUMMARY ====');
    console.log(`Total teams: ${teams.length}`);
    console.log(`Total PENDING teams: ${pendingTeams.length}`);
    console.log(`Total ELIGIBLE teams: ${eligibleCount}`);
    console.log('Ineligible teams breakdown:');
    console.log(`  - Teams with invalid emails: ${ineligibleEmailCount}`);
    console.log(`  - Teams with no members: ${ineligibleEmptyTeamCount}`);
    console.log(`  - Teams with duplicate members: ${ineligibleDuplicatesCount}`);
    console.log(`  - Teams with age mismatches: ${ineligibleAgeMismatchCount}`);
    
    setPendingCount(eligibleCount);
  }, [teams]);

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
      setDownloadInProgress('docx');
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
      toast.error('Failed to generate DOCX file. Please try again.');
    } finally {
      setDownloadInProgress(null);
    }
  };

  const handleGenerateXlsx = async () => {
    try {
      setDownloadInProgress('xlsx');
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
      toast.error('Failed to generate XLSX file. Please try again.');
    } finally {
      setDownloadInProgress(null);
    }
  };
  
  const handleRunDiagnostic = async () => {
    try {
      toast.info('Running eligibility diagnostic check...');
      
      const response = await fetch(`/api/organizer/events/${eventId}/rawlist/diagnostic`);
      
      if (!response.ok) {
        toast.error(`Diagnostic check failed: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      setDiagnosticData(data);
      setShowDiagnosticDialog(true);
      
      // Log detailed diagnostic information
      console.log('==== DIAGNOSTIC RESULTS ====', data);
      
      // Compare with frontend eligibility count
      console.log(`Frontend eligible count: ${pendingCount}`);
      console.log(`Backend eligible count: ${data.summary?.eligibleCount || 0}`);
      
      if (data.summary?.eligibleCount === 0) {
        console.log('==== ELIGIBILITY BLOCKERS ====');
        console.log(`Teams with no members: ${data.summary?.teamsWithNoMembersCount || 0}`);
        console.log(`Teams with invalid emails: ${data.summary?.teamsWithInvalidEmailsCount || 0}`);
        console.log(`Teams with duplicate members: ${data.summary?.teamsWithDuplicateMembersCount || 0}`);
        console.log(`Teams with age mismatches: ${data.summary?.teamsWithAgeMismatchesCount || 0}`);
      }
      
      toast.success('Diagnostic completed!');
      
    } catch (error) {
      console.error('Error running diagnostic:', error);
      toast.error('Failed to run eligibility diagnostic');
    }
  };

  const handleApproveAndDownload = async () => {
    try {
      setDownloadInProgress('approve');
      console.log('==== STARTING APPROVE AND DOWNLOAD ====');
      console.log(`Sending request to approve ${pendingCount} eligible teams`);
      
      // First, log the criteria we're using on the frontend for eligibility
      console.log('Frontend eligibility criteria:');
      console.log('1. Status must be PENDING');
      console.log('2. Team must have at least one member');
      console.log('3. No age mismatches with target group');
      console.log('4. No duplicate members across ANY teams');
      console.log('5. Valid email format: /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/');
      
      // Run diagnostic first to see eligibility count
      await handleRunDiagnostic();
      
      const response = await fetch(`/api/organizer/events/${eventId}/rawlist/approved-xlsx`);
      console.log(`Response status: ${response.status}`);
      
      // Log response headers if available
      console.log('Response headers:');
      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });
      
      if (response.status === 404) {
        // Try to extract more details from the response
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          console.error('API error details:', errorJson);
          toast.warning(`No eligible teams found: ${errorJson.error || 'Unknown error'}`);
        } catch (e) {
          console.error('Raw API error:', errorText);
          toast.warning('No eligible PENDING teams found that meet the criteria for approval.');
        }
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to approve and generate XLSX');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `approved-teams-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Teams successfully approved and downloaded!');
      
      // Refresh the teams data to show updated statuses
      console.log('Refreshing team data after successful approval');
      await fetchTeams();
      
    } catch (error) {
      console.error('Error approving and generating XLSX:', error);
      toast.error('Failed to approve teams and generate XLSX file. Please try again.');
    } finally {
      setDownloadInProgress(null);
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
      {/* Diagnostic Results Dialog */}
      <Dialog open={showDiagnosticDialog} onOpenChange={setShowDiagnosticDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eligibility Diagnostic Results</DialogTitle>
            <DialogDescription>Detailed analysis of team eligibility status</DialogDescription>
          </DialogHeader>
          
          {diagnosticData ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="font-medium text-blue-800 mb-2">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-xs text-gray-500">Pending Teams</div>
                    <div className="text-lg font-bold">{diagnosticData.summary?.totalPendingCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-xs text-gray-500">Eligible</div>
                    <div className="text-lg font-bold text-green-600">{diagnosticData.summary?.eligibleCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-xs text-gray-500">Invalid Email</div>
                    <div className="text-lg font-bold text-amber-600">{diagnosticData.summary?.teamsWithInvalidEmailsCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-xs text-gray-500">Duplicate Members</div>
                    <div className="text-lg font-bold text-red-600">{diagnosticData.summary?.teamsWithDuplicateMembersCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-xs text-gray-500">Age Mismatches</div>
                    <div className="text-lg font-bold text-purple-600">{diagnosticData.summary?.teamsWithAgeMismatchesCount || 0}</div>
                  </div>
                </div>
              </div>
              
              {/* Filter information */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Filter Criteria</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Email Validation:</strong> {diagnosticData.filters?.emailRegex}</div>
                  <div><strong>Member Check:</strong> {diagnosticData.filters?.hasMemberCheck}</div>
                  <div><strong>Duplicate Logic:</strong> {diagnosticData.filters?.duplicateLogic}</div>
                </div>
              </div>
              
              {/* Sample teams table */}
              {diagnosticData.sampleTeams && diagnosticData.sampleTeams.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <h3 className="font-medium p-4 bg-gray-50 border-b">Sample PENDING Teams</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-xs">
                        <tr>
                          <th className="p-2 text-left">Team Name</th>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Members</th>
                          <th className="p-2 text-left">Age Mismatch</th>
                          <th className="p-2 text-left">Duplicates</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {diagnosticData.sampleTeams.map((team: any, index: number) => (
                          <tr key={team.id} className={team.eligibilityStatus === 'eligible' ? 'bg-green-50' : 'bg-red-50'}>
                            <td className="p-2 text-sm">{team.teamName}</td>
                            <td className="p-2 text-sm">
                              <span className={`inline-block px-2 py-1 text-xs rounded ${team.emailStatus === 'valid' ? 'bg-green-100' : 'bg-red-100'}`}>
                                {team.emailStatus}
                              </span>
                            </td>
                            <td className="p-2 text-sm">{team.memberCount}</td>
                            <td className="p-2 text-sm">{team.hasAgeMismatch}</td>
                            <td className="p-2 text-sm">{team.hasDuplicateMembers}</td>
                            <td className="p-2 text-sm font-medium">{team.eligibilityStatus}</td>
                            <td className="p-2 text-sm">{team.failureReason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <div>
                  {diagnosticData.summary?.eligibleCount === 0 && (
                    <div className="text-red-600 text-sm">
                      No teams are currently eligible for approval. Please check the criteria above.
                    </div>
                  )}
                  {pendingCount !== diagnosticData.summary?.eligibleCount && (
                    <div className="text-amber-600 text-sm">
                      Warning: Frontend count ({pendingCount}) doesn't match backend count ({diagnosticData.summary?.eligibleCount || 0}).
                    </div>
                  )}
                </div>
                <Button onClick={() => setShowDiagnosticDialog(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading diagnostic data...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
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
            <Button
              variant="secondary"
              onClick={handleRunDiagnostic}
              className="flex items-center gap-2"
            >
              Check Eligibility
            </Button>
            <Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Download Options
                  </DialogTitle>
                  <DialogDescription>
                    Choose a format to download the raw team list data.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 py-4">
                  <Button 
                    onClick={handleGenerateDocx} 
                    className="flex items-center justify-center gap-2 h-16"
                    disabled={downloadInProgress !== null}
                  >
                    {downloadInProgress === 'docx' ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating DOCX...</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="h-5 w-5" />
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">Word Document (DOCX)</span>
                          <span className="text-xs text-muted-foreground">Complete report with team details</span>
                        </div>
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleGenerateXlsx} 
                    className="flex items-center justify-center gap-2 h-16" 
                    variant="secondary"
                    disabled={downloadInProgress !== null}
                  >
                    {downloadInProgress === 'xlsx' ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Generating XLSX...</span>
                      </div>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-5 w-5" />
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">Excel Spreadsheet (XLSX)</span>
                          <span className="text-xs text-muted-foreground">Tabular data for analysis</span>
                        </div>
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleApproveAndDownload} 
                    className="flex items-center justify-center gap-2 h-16"
                    variant="default"
                    disabled={downloadInProgress !== null || pendingCount === 0}
                  >
                    {downloadInProgress === 'approve' ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Approving and downloading...</span>
                      </div>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        <div className="flex flex-col items-start">
                          <div className="flex items-center">
                            <span className="font-semibold">Download & Approve</span>
                            {pendingCount > 0 && (
                              <Badge className="ml-2 bg-blue-500">{pendingCount}</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {pendingCount > 0 
                              ? `Approve and download ${pendingCount} eligible pending teams` 
                              : "No eligible pending teams to approve"}
                          </span>
                        </div>
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={downloadInProgress !== null}>
                      <X className="mr-2 h-4 w-4" />
                      Close
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
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
                                {team.teamEmail && (
                                  <span className="text-xs text-blue-600 truncate">{team.teamEmail}</span>
                                )}
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
                                      <tr key={member.id} className={`border-b last:border-b-0 hover:bg-yellow-100 ${member.isDuplicate ? 'bg-orange-200 hover:bg-orange-300' : ''}`}>
                                        <td className="p-2">{memberIndex + 1}</td>
                                        <td className="p-2">
                                          <div className="font-medium">{member.participantName}</div>
                                          {member.isDuplicate && (
                                            <div className="text-xs text-orange-700 font-medium mt-1">
                                              ⚠️ In multiple teams: {member.duplicateTeams?.join(', ')}
                                            </div>
                                          )}
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
