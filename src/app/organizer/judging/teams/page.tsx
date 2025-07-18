"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";

interface Team {
  attendanceTeamId: number;
  teamId: number;
  contingentId: number;
  teamName: string;
  contingentName: string;
  eventContestId: number;
  judgingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  judgingSessionId: number | null;
  totalScore: number | null;
}

interface EventContest {
  id: number;
  eventId: number;
  contestId: number;
  judgingTemplateId: number | null;
}

export default function JudgingTeamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const contestId = searchParams.get('contestId');
  
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventContest, setEventContest] = useState<EventContest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch teams for judging
  useEffect(() => {
    if (!eventId || !contestId) {
      toast.error('Event ID and Contest ID are required');
      router.push('/organizer/judging/select-event');
      return;
    }
    
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/judging/teams?eventId=${eventId}&contestId=${contestId}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch teams for judging');
        }
        
        const data = await res.json();
        setTeams(data.teams);
        setEventContest(data.eventContest);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast.error('Failed to load teams for judging');
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [eventId, contestId, router]);
  
  // Filter teams based on search term and active tab
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = 
      team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.contingentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "not-started") return matchesSearch && team.judgingStatus === "NOT_STARTED";
    if (activeTab === "in-progress") return matchesSearch && team.judgingStatus === "IN_PROGRESS";
    if (activeTab === "completed") return matchesSearch && team.judgingStatus === "COMPLETED";
    return matchesSearch;
  });
  
  // Count teams by status for tab badges
  const notStartedCount = teams.filter(team => team.judgingStatus === "NOT_STARTED").length;
  const inProgressCount = teams.filter(team => team.judgingStatus === "IN_PROGRESS").length;
  const completedCount = teams.filter(team => team.judgingStatus === "COMPLETED").length;
  
  // Handle starting a judging session
  const handleStartJudging = async (team: Team) => {
    try {
      // If there's already a session, navigate to it
      if (team.judgingSessionId) {
        router.push(`/organizer/judging/session/${team.judgingSessionId}`);
        return;
      }
      
      // Otherwise create a new session
      const res = await fetch('/api/judging/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceTeamId: team.attendanceTeamId,
          eventContestId: team.eventContestId
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create judging session');
      }
      
      const data = await res.json();
      
      toast.success('Judging session created successfully');
      router.push(`/organizer/judging/session/${data.judgingSession.id}`);
      
    } catch (error) {
      console.error('Error creating judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create judging session');
    }
  };
  
  // Handle refreshing the teams list
  const refreshTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/judging/teams?eventId=${eventId}&contestId=${contestId}`);
      
      if (!res.ok) {
        throw new Error('Failed to refresh teams');
      }
      
      const data = await res.json();
      setTeams(data.teams);
      setLoading(false);
      toast.success('Teams list refreshed');
    } catch (error) {
      console.error('Error refreshing teams:', error);
      toast.error('Failed to refresh teams');
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Loading..." description="Getting teams for judging" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!eventContest) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Error" description="Event contest not found" />
        <Card>
          <CardContent className="pt-6">
            <p>The specified event contest was not found or does not have a judging template assigned.</p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/organizer/judging/select-event')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Judge Teams" 
        description={`Select teams to judge for the selected contest`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTeams}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/organizer/judging/results?eventId=${eventId}&contestId=${contestId}`}>
                View Results
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/organizer/judging/select-event')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Select Different Contest
            </Button>
          </div>
        }
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Teams <Badge className="ml-2 bg-gray-100 text-gray-800">{teams.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="not-started">
            Not Started <Badge className="ml-2 bg-gray-100 text-gray-800">{notStartedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress <Badge className="ml-2 bg-green-100 text-green-800">{inProgressCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed <Badge className="ml-2 bg-blue-100 text-blue-800">{completedCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          <TeamsTable teams={filteredTeams} onStartJudging={handleStartJudging} />
        </TabsContent>
        
        <TabsContent value="not-started" className="space-y-4 mt-4">
          <TeamsTable teams={filteredTeams} onStartJudging={handleStartJudging} />
        </TabsContent>
        
        <TabsContent value="in-progress" className="space-y-4 mt-4">
          <TeamsTable teams={filteredTeams} onStartJudging={handleStartJudging} />
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4 mt-4">
          <TeamsTable teams={filteredTeams} onStartJudging={handleStartJudging} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Table component for teams
function TeamsTable({ 
  teams, 
  onStartJudging 
}: { 
  teams: Team[], 
  onStartJudging: (team: Team) => void 
}) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <Search className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium">No teams found</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4 max-w-md">
          Try adjusting your search or filter to find what you're looking for
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead>Contingent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.attendanceTeamId}>
              <TableCell>
                <div className="font-medium">{team.teamName}</div>
              </TableCell>
              <TableCell>
                <div>{team.contingentName}</div>
              </TableCell>
              <TableCell>
                <Badge 
                  className={
                    team.judgingStatus === "COMPLETED" ? "bg-blue-100 text-blue-800" :
                    team.judgingStatus === "IN_PROGRESS" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }
                >
                  {team.judgingStatus === "NOT_STARTED" ? "Not Started" : 
                   team.judgingStatus === "IN_PROGRESS" ? "In Progress" : "Completed"}
                </Badge>
              </TableCell>
              <TableCell>
                {team.totalScore !== null ? team.totalScore.toFixed(2) : "-"}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant={team.judgingStatus === "COMPLETED" ? "outline" : "default"}
                  size="sm"
                  onClick={() => onStartJudging(team)}
                >
                  {team.judgingStatus === "NOT_STARTED" ? "Start Judging" : 
                   team.judgingStatus === "IN_PROGRESS" ? "Continue" : "View"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
