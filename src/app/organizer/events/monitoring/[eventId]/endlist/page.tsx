"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  Baby,
  User,
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import TeamTransferModal from '@/components/team-transfer-modal';

// Loading spinner component
function LoadingSpinner({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const sizeClass = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  }[size];
  
  return <Loader2 className={`${sizeClass} animate-spin`} />;
}

interface TeamMember {
  id: number;
  participantName: string;
  email: string;
  ic: string;
  edu_level: string;
  class_grade: string;
  age: number;
  formattedClassGrade: string;
  contingentName: string;
  contingentType: string;
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
  ppd: string;
  members: TeamMember[];
}

interface EventInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function EndListPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>("ALL");
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    record: 80,
    teamName: 200,
    status: 120,
    targetGroup: 100,
    state: 120,
    ppd: 120,
    contingent: 150,
    registrationDate: 140,
    actions: 180,
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    teamId: number | null;
    teamName: string;
  }>({ isOpen: false, teamId: null, teamName: '' });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTeamForTransfer, setSelectedTeamForTransfer] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Helper function to get icon for target group
  const getTargetGroupIcon = (targetGroupLabel: string) => {
    switch (targetGroupLabel) {
      case 'Kids':
        return <Baby className="h-4 w-4" />;
      case 'Teens':
        return <User className="h-4 w-4" />;
      case 'Youth':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  // Helper function to group teams
  const groupTeams = (teams: Team[]) => {
    const grouped: Record<string, Record<string, Record<string, Record<string, Team[]>>>> = {};
    
    teams.forEach(team => {
      const targetGroup = team.targetGroupLabel || 'Other';
      const state = team.stateName || 'Unknown State';
      const ppd = team.ppd || 'Unknown PPD';
      const contingent = team.contingentName || 'Unknown Contingent';
      
      if (!grouped[targetGroup]) grouped[targetGroup] = {};
      if (!grouped[targetGroup][state]) grouped[targetGroup][state] = {};
      if (!grouped[targetGroup][state][ppd]) grouped[targetGroup][state][ppd] = {};
      if (!grouped[targetGroup][state][ppd][contingent]) grouped[targetGroup][state][ppd][contingent] = [];
      
      grouped[targetGroup][state][ppd][contingent].push(team);
    });
    
    return grouped;
  };

  const fetchEventInfo = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch event information");
      }
      const data = await response.json();
      setEventInfo(data);
    } catch (error) {
      console.error("Error fetching event info:", error);
      toast({
        title: "Error",
        description: "Failed to load event information.",
        variant: "destructive",
      });
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/endlist`);
      if (!response.ok) {
        throw new Error("Failed to fetch teams");
      }
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams data.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (eventId) {
      Promise.all([fetchEventInfo(), fetchTeams()]).finally(() => {
        setLoading(false);
      });
    }
  }, [eventId]);

  const handleBackToMonitoring = () => {
    router.push("/organizer/events/monitoring");
  };

  // Handle column resize
  const handleMouseDown = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(columnKey);
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "APPROVED_SPECIAL":
        return "bg-blue-100 text-blue-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const approvedTeams = teams.filter(team => team.status === "APPROVED" || team.status === "APPROVED_SPECIAL");
  const specialApprovalTeams = teams.filter(team => team.status === "APPROVED_SPECIAL");
  const acceptedTeams = teams.filter(team => team.status === "ACCEPTED");
  const totalTeams = approvedTeams.length + acceptedTeams.length;
  const totalParticipants = teams.reduce((total, team) => total + team.members.length, 0);

  // Calculate additional statistics
  const schoolContingents = new Set(teams.filter(team => team.contingentType === 'SCHOOL').map(team => team.contingentName));
  const schoolTeams = teams.filter(team => team.contingentType === 'SCHOOL');
  
  // Group teams by target group and count unique schools
  const kidsTeams = teams.filter(team => team.targetGroupLabel === 'Kids');
  const kidsSchools = new Set(kidsTeams.filter(team => team.contingentType === 'SCHOOL').map(team => team.contingentName));
  
  const teensTeams = teams.filter(team => team.targetGroupLabel === 'Teens');
  const teensSchools = new Set(teensTeams.filter(team => team.contingentType === 'SCHOOL').map(team => team.contingentName));
  
  const youthTeams = teams.filter(team => team.targetGroupLabel === 'Youth');
  const youthSchools = new Set(youthTeams.filter(team => team.contingentType === 'SCHOOL').map(team => team.contingentName));

  // Filter teams based on search and filters
  const filteredTeams = teams.filter(team => {
    const matchesSearch = searchTerm === "" || 
      team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.contingentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.stateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.members.some(member => 
        member.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.ic.includes(searchTerm)
      );
    
    const matchesStatus = statusFilter === "ALL" || team.status === statusFilter;
    const matchesTargetGroup = targetGroupFilter === "ALL" || team.targetGroupLabel === targetGroupFilter;
    
    return matchesSearch && matchesStatus && matchesTargetGroup;
  });

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

  const handleSetToPending = (teamId: number, teamName: string) => {
    setConfirmationModal({ isOpen: true, teamId, teamName });
  };

  const handleTransferTeam = (teamId: number, teamName: string) => {
    setSelectedTeamForTransfer({ id: teamId, name: teamName });
    setTransferModalOpen(true);
  };

  const handleTransferComplete = () => {
    // Refresh the teams list after transfer
    fetchTeams();
    setSelectedTeamForTransfer(null);
    setTransferModalOpen(false);
    
    toast({
      title: "Transfer Complete",
      description: "Team has been successfully transferred to the new event.",
    });
  };

  const confirmSetToPending = async () => {
    if (!confirmationModal.teamId) return;

    try {
      const response = await fetch(`/api/organizer/events/${eventId}/endlist/${confirmationModal.teamId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'PENDING' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update team status');
      }

      // Refresh the teams data
      await fetchTeams();
      
      // Close modal
      setConfirmationModal({ isOpen: false, teamId: null, teamName: '' });
    } catch (error) {
      console.error('Error updating team status:', error);
      alert('Failed to update team status. Please try again.');
    }
  };

  const handleGenerateDocx = async () => {
    setIsGeneratingDocx(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/endlist/docx`);
      
      if (!response.ok) {
        throw new Error('Failed to generate DOCX');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `endlist-${eventId}-${new Date().toISOString().split('T')[0]}.docx`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "DOCX file has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating docx:", error);
      toast({
        title: "Error",
        description: "Failed to generate DOCX file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleBackToMonitoring}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Monitoring
            </Button>
            <PageHeader
              title={`End List - ${eventInfo?.name || 'Event'}`}
              description={`Final list of approved and accepted teams for ${eventInfo?.name || 'this event'}`}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/monitoring/${params.eventId}/rawlist`)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Raw List
            </Button>
            <Button
              onClick={handleGenerateDocx}
              disabled={isGeneratingDocx}
              className="flex items-center gap-2"
            >
              {isGeneratingDocx ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate DOCX
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-green-600">
                {approvedTeams.length}
              </CardTitle>
              <CardDescription>
                Approved Teams
                {specialApprovalTeams.length > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    ({specialApprovalTeams.length} with special approval)
                  </div>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-blue-600">
                {acceptedTeams.length}
              </CardTitle>
              <CardDescription>Accepted Teams</CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-purple-600">
                {totalTeams}
              </CardTitle>
              <CardDescription>Total Teams</CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-orange-600">
                {totalParticipants}
              </CardTitle>
              <CardDescription>Total Participants</CardDescription>
            </CardHeader>
          </Card>
          
          {/* School Statistics Card with Two Grids */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 mb-3 text-center">
                Schools Participations
              </CardTitle>
              <div className="grid grid-cols-2 gap-4 divide-x divide-gray-200">
                <div className="text-center">
                  <CardTitle className="text-2xl font-bold text-indigo-600">
                    {schoolContingents.size}
                  </CardTitle>
                  <CardDescription className="text-xs">School Contingents</CardDescription>
                </div>
                <div className="text-center pl-4">
                  <CardTitle className="text-2xl font-bold text-indigo-600">
                    {schoolTeams.length}
                  </CardTitle>
                  <CardDescription className="text-xs">School Teams</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          {/* Kids Teams Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-pink-600">
                {kidsTeams.length}
              </CardTitle>
              <CardDescription>
                Total Kids Teams
                {kidsSchools.size > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    from {kidsSchools.size} schools
                  </div>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Teens Teams Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-cyan-600">
                {teensTeams.length}
              </CardTitle>
              <CardDescription>
                Total Teens Teams
                {teensSchools.size > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    from {teensSchools.size} schools
                  </div>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
          
          {/* Youth Teams Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-emerald-600">
                {youthTeams.length}
              </CardTitle>
              <CardDescription>
                Total Youth Teams
                {youthSchools.size > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    from {youthSchools.size} schools
                  </div>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by team name, contingent, state, participant name, or IC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="APPROVED">Approved</option>
                  <option value="ACCEPTED">Accepted</option>
                </select>
                <select
                  value={targetGroupFilter}
                  onChange={(e) => setTargetGroupFilter(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="ALL">All Target Groups</option>
                  <option value="Kids">Kids</option>
                  <option value="Teens">Teens</option>
                  <option value="Youth">Youth</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database-style Table */}
        <Card>
          <CardHeader>
            <CardTitle>End List Database View</CardTitle>
            <CardDescription>
              {filteredTeams.length} teams ({filteredTeams.reduce((sum, team) => sum + team.members.length, 0)} total participants) - Click team names to view members
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto" style={{ width: '100%' }}>
              <table className="w-full border-collapse" style={{ 
                tableLayout: 'fixed',
                width: Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 'px',
                minWidth: '100%'
              }}>
                <thead>
                  <tr className="bg-muted/50 border-b">
                    {[
                      { key: 'record', label: 'Record' },
                      { key: 'teamName', label: 'Team Name' },
                      { key: 'status', label: 'Status' },
                      { key: 'targetGroup', label: 'Target Group' },
                      { key: 'state', label: 'State' },
                      { key: 'ppd', label: 'PPD' },
                      { key: 'contingent', label: 'Contingent' },
                      { key: 'registrationDate', label: 'Registration Date' },
                      { key: 'actions', label: 'Actions' }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className="text-left font-medium text-muted-foreground px-4 py-3 text-sm relative select-none"
                        style={{ width: columnWidths[column.key] + 'px' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate pr-2">{column.label}</span>
                          <div
                            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors ${
                              isResizing === column.key ? 'bg-primary' : ''
                            }`}
                            onMouseDown={(e) => handleMouseDown(column.key, e)}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team, teamIndex) => (
                    <React.Fragment key={team.id}>
                      {/* Team Row */}
                      <tr className="hover:bg-muted/30 border-b">
                        <td 
                          className="px-4 py-3 font-mono text-xs text-muted-foreground"
                          style={{ width: columnWidths.record + 'px' }}
                        >
                          <div className="truncate">{teamIndex + 1}</div>
                        </td>
                        <td 
                          className="px-4 py-3 font-medium cursor-pointer hover:text-primary"
                          style={{ width: columnWidths.teamName + 'px' }}
                          onClick={() => toggleTeamExpansion(team.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {expandedTeams.has(team.id) ? (
                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                              <div className="flex flex-col">
                                <span className="truncate hover:underline font-medium">{team.teamName}</span>
                                <span className="text-xs text-muted-foreground truncate">{team.contestName}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {team.members.length} members
                            </Badge>
                          </div>
                        </td>
                        <td 
                          className="px-4 py-3"
                          style={{ width: columnWidths.status + 'px' }}
                        >
                          <div className="truncate">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusBadgeColor(team.status)}`}
                            >
                              {team.status}
                            </Badge>
                          </div>
                        </td>
                        <td 
                          className="px-4 py-3"
                          style={{ width: columnWidths.targetGroup + 'px' }}
                        >
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              {getTargetGroupIcon(team.targetGroupLabel)}
                              <span className="text-sm truncate">{team.targetGroupLabel}</span>
                            </div>
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
                          style={{ width: columnWidths.ppd + 'px' }}
                        >
                          <div className="truncate">{team.ppd}</div>
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
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => handleSetToPending(team.id, team.teamName)}
                            >
                              Set to Pending
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                              onClick={() => handleTransferTeam(team.id, team.teamName)}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Transfer
                            </Button>
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
                              <div className="mb-2">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Team Members ({team.members.length})
                                </h4>
                              </div>
                              <div className="border rounded-md bg-yellow-50">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-yellow-100">
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-12">#</th>
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[180px]">Participant Name</th>
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[200px]">Email</th>
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[120px]">IC Number</th>
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[100px]">Class/Grade</th>
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-16">Age</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {team.members.map((member, memberIndex) => (
                                      <tr key={member.id} className="border-b last:border-b-0 hover:bg-yellow-100">
                                        <td className="py-2 px-3 text-center font-mono text-xs text-muted-foreground">
                                          {memberIndex + 1}
                                        </td>
                                        <td className="py-2 px-3 font-medium">
                                          <div className="truncate">{member.participantName}</div>
                                        </td>
                                        <td className="py-2 px-3 text-muted-foreground">
                                          <div className="truncate">{member.email}</div>
                                        </td>
                                        <td className="py-2 px-3 font-mono text-sm">
                                          <div className="truncate">{member.ic || 'N/A'}</div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="truncate">{member.formattedClassGrade || 'N/A'}</div>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <div className="truncate">{member.age || 'N/A'}</div>
                                        </td>
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
              Are you sure you want to set the status of team <strong>"{confirmationModal.teamName}"</strong> to PENDING?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmationModal({ isOpen: false, teamId: null, teamName: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmSetToPending}
              >
                Set to Pending
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Team Transfer Modal */}
      {selectedTeamForTransfer && (
        <TeamTransferModal
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setSelectedTeamForTransfer(null);
          }}
          eventId={eventId}
          teamId={selectedTeamForTransfer.id}
          teamName={selectedTeamForTransfer.name}
          onTransferComplete={handleTransferComplete}
        />
      )}
    </DashboardShell>
  );
}
