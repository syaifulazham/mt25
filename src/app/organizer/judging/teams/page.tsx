"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
  
  // Fetch teams for judging
  useEffect(() => {
    if (!eventId || !contestId) {
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
        setLoading(false);
      }
    };

    fetchTeams();
  }, [eventId, contestId, router]);
  
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
        <div className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/organizer/judging/select-event')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Selection
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Judge Teams" 
        description={`Select teams to judge for the selected contest`}
      />
      
      <div className="space-y-4">
        <p>Event ID: {eventId}</p>
        <p>Contest ID: {contestId}</p>
        <p>Teams found: {teams.length}</p>
        
        {teams.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Teams:</h3>
            {teams.map((team) => (
              <div key={team.attendanceTeamId} className="p-4 border rounded">
                <p><strong>Team:</strong> {team.teamName}</p>
                <p><strong>Contingent:</strong> {team.contingentName}</p>
                <p><strong>Status:</strong> {team.judgingStatus}</p>
                <p><strong>Score:</strong> {team.totalScore || 'N/A'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
