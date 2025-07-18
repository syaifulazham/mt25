"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Plus, Award, AlertCircle } from "lucide-react";
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
  id: number;
  attendanceTeamId: number;
  name: string;
  contingentId: number;
  contingentName: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  sessionId?: number;
  judgingStartTime?: string;
  judgingEndTime?: string | null;
}

interface Event {
  id: number;
  name: string;
}

interface Contest {
  id: number;
  name: string;
}

export default function JudgingTeamsPage({ 
  params 
}: { 
  params: { 
    id: string;
    contestId: string;
  } 
}) {
  const router = useRouter();
  const eventId = params.id;
  const contestId = params.contestId;
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);

  // Fetch teams data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch event details
        const eventRes = await fetch(`/api/organizer/events/${eventId}`);
        if (!eventRes.ok) throw new Error('Failed to fetch event');
        const eventData = await eventRes.json();
        setEvent(eventData);
        
        // Fetch contest details
        const contestRes = await fetch(`/api/organizer/events/${eventId}/contests/${contestId}`);
        if (!contestRes.ok) throw new Error('Failed to fetch contest');
        const contestData = await contestRes.json();
        setContest(contestData);
        
        // Fetch teams for judging
        const teamsRes = await fetch(`/api/judging/teams?eventId=${eventId}&contestId=${contestId}`);
        if (!teamsRes.ok) throw new Error('Failed to fetch teams');
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load teams data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, contestId]);

  // Filter teams based on search term and active tab
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.contingentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "not-started" && team.status === "NOT_STARTED") ||
      (activeTab === "in-progress" && team.status === "IN_PROGRESS") ||
      (activeTab === "completed" && team.status === "COMPLETED");
    
    return matchesSearch && matchesTab;
  });

  // Create new judging session
  const createJudgingSession = async (attendanceTeamId: number) => {
    try {
      const res = await fetch('/api/judging/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceTeamId,
          eventContestId: parseInt(contestId),
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create judging session');
      }
      
      const data = await res.json();
      
      // Navigate to judging session
      router.push(`/organizer/judging/session/${data.judgingSession.id}`);
    } catch (error) {
      console.error('Error creating judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create judging session');
    }
  };

  // Count teams by status
  const notStartedCount = teams.filter(team => team.status === "NOT_STARTED").length;
  const inProgressCount = teams.filter(team => team.status === "IN_PROGRESS").length;
  const completedCount = teams.filter(team => team.status === "COMPLETED").length;

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!event || !contest) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Error" description="Event or contest not found" />
        <Card>
          <CardContent className="pt-6">
            <p>The specified event or contest could not be found.</p>
            <div className="mt-4">
              <Button 
                variant="outline"
                onClick={() => router.push(`/organizer/events/${eventId}/judging`)}
              >
                Back to Judging
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
        title={`Teams for ${contest.name}`}
        description={`Judge teams for ${event.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/${eventId}/judging/${contestId}/results`)}
              className="gap-2"
            >
              <Award className="h-4 w-4" />
              View Results
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/organizer/events/${eventId}/judging`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Contests
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
                    <TableHead>Contingent</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.attendanceTeamId}>
                      <TableCell className="font-medium">
                        {team.name}
                      </TableCell>
                      <TableCell>
                        {team.contingentName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={
                            team.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                            team.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" :
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {team.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {team.status === "NOT_STARTED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createJudgingSession(team.attendanceTeamId)}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Start Judging
                          </Button>
                        ) : (
                          <Button 
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/organizer/judging/session/${team.sessionId}`}>
                              {team.status === "IN_PROGRESS" ? "Continue Judging" : "View Judging"}
                            </Link>
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
