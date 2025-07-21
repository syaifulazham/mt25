"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Award, AlertCircle, Lock, LogOut } from "lucide-react";
import { useJudgeAuth } from "@/hooks/useJudgeAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";

interface Team {
  attendanceTeamId: number;
  hashcode: string;
  contingentId: number;
  teamId: number;
  eventId: number;
  attendanceStatus: string;
  teamName: string;
  contingentName: string;
  eventContestId: number;
  contestName: string;
  judgingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  judgingSessionId: number | null;
  totalScore: number | null;
}

interface Event {
  id: number;
  name: string;
}

interface Contest {
  id: number;
  name: string;
}



export default function JudgeEndpointPage({ 
  params 
}: { 
  params: { 
    hashcode: string;
  } 
}) {
  const router = useRouter();
  const hashcode = params.hashcode;
  
  const { loading, authenticated, judgeEndpoint, authenticate, logout } = useJudgeAuth(hashcode);
  const [passcode, setPasscode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [teams, setTeams] = useState<Team[]>([]);

  // Handle passcode authentication
  const handleAuthenticate = async () => {
    const success = await authenticate(passcode);
    if (success && judgeEndpoint) {
      await fetchTeamsData(judgeEndpoint.eventId, judgeEndpoint.contestId);
    }
  };

  // Fetch teams data when authenticated
  useEffect(() => {
    if (authenticated && judgeEndpoint) {
      fetchTeamsData(judgeEndpoint.eventId, judgeEndpoint.contestId);
    }
  }, [authenticated, judgeEndpoint]);

  // Fetch teams data
  const fetchTeamsData = async (eventId: number, contestId: number) => {
    try {
      const res = await fetch(`/api/judge/teams?hashcode=${hashcode}&eventId=${eventId}&contestId=${contestId}`);
      if (!res.ok) throw new Error('Failed to fetch teams');
      const teamsData = await res.json();
      setTeams(teamsData.teams);
    } catch (error) {
      console.error('Error fetching teams data:', error);
      toast.error('Failed to load teams data');
    }
  };

  // Filter teams based on search term and active tab
  const filteredTeams = teams.filter((team) => {
    const teamName = team?.teamName || '';
    const contingentName = team?.contingentName || '';
    
    const matchesSearch = 
      teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contingentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "not-started" && team?.judgingStatus === "NOT_STARTED") ||
      (activeTab === "in-progress" && team?.judgingStatus === "IN_PROGRESS") ||
      (activeTab === "completed" && team?.judgingStatus === "COMPLETED");
    
    return matchesSearch && matchesTab;
  });

  // Create new judging session
  const createJudgingSession = async (attendanceTeamId: number, eventContestId: number) => {
    try {
      const res = await fetch('/api/judge/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode,
          attendanceTeamId,
          eventContestId,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create judging session');
      }
      
      const data = await res.json();
      
      // Navigate to judging session with judge context
      router.push(`/judge/${hashcode}/session/${data.judgingSession.id}`);
    } catch (error) {
      console.error('Error creating judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create judging session');
    }
  };

  // Calculate team counts by judging status
  const notStartedCount = teams.filter(team => team.judgingStatus === "NOT_STARTED").length;
  const inProgressCount = teams.filter(team => team.judgingStatus === "IN_PROGRESS").length;
  const completedCount = teams.filter(team => team.judgingStatus === "COMPLETED").length;

  // Authentication screen
  if (!authenticated) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader 
          title="Judge Access"
          description="Enter your passcode to access the judging interface"
        />
        
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please enter your 6-character passcode to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg font-mono"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAuthenticate();
                  }
                }}
              />
            </div>
            <Button 
              onClick={handleAuthenticate} 
              className="w-full"
              disabled={passcode.length !== 6}
            >
              Access Judging Interface
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!judgeEndpoint) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Error" description="Judge endpoint not found" />
        <Card>
          <CardContent className="pt-6">
            <p>The specified judge endpoint could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title={`Teams for ${judgeEndpoint.contest.name}`}
        description={`Judge teams for ${judgeEndpoint.event.name} - ${judgeEndpoint.judge_name || 'Anonymous Judge'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/judge/${hashcode}/results`)}
              className="gap-2"
            >
              <Award className="h-4 w-4" />
              View Results
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notStartedCount}</div>
            <div className="text-sm text-gray-500 mt-1">Teams waiting for judging</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{inProgressCount}</div>
            <div className="text-sm text-gray-500 mt-1">Teams being judged</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedCount}</div>
            <div className="text-sm text-gray-500 mt-1">Teams fully judged</div>
          </CardContent>
        </Card>
      </div>
      
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
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Teams ({teams.length})</TabsTrigger>
          <TabsTrigger value="not-started">Not Started ({notStartedCount})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgressCount})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {filteredTeams.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team?.attendanceTeamId || `team-${Math.random()}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{team?.teamName || "Unknown Team"}</div>
                          <div className="text-sm text-muted-foreground">
                            {team?.contingentName || "Unknown Contingent"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={
                            team?.judgingStatus === "COMPLETED" ? "bg-green-100 text-green-800" :
                            team?.judgingStatus === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" :
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {(team?.judgingStatus || "NOT_STARTED").replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {team?.totalScore !== null && team?.totalScore !== undefined 
                          ? Number(team.totalScore).toFixed(1) 
                          : team?.judgingStatus === "COMPLETED" 
                            ? "0.0" 
                            : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {team?.judgingStatus === "NOT_STARTED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createJudgingSession(team?.attendanceTeamId, team?.eventContestId)}
                            className="gap-1"
                            disabled={!team?.attendanceTeamId}
                          >
                            <Plus className="h-4 w-4" />
                            Start Judging
                          </Button>
                        ) : team?.judgingStatus ? (
                          <Button 
                            variant="outline"
                            size="sm"
                            asChild
                            disabled={!team?.judgingSessionId}
                          >
                            <Link href={`/judge/${hashcode}/session/${team?.judgingSessionId || ''}`}>
                              {team?.judgingStatus === "IN_PROGRESS" ? "Continue Judging" : "View Judging"}
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            Unknown Status
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center py-8">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-lg font-medium">No teams found</p>
                <p className="text-muted-foreground">
                  {searchTerm ? "Try adjusting your search" : "No teams are available for this contest"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
