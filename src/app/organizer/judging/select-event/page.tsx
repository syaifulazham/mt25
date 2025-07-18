"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Event {
  id: number;
  name: string;
}

interface Contest {
  id: number;
  name: string;
  description?: string;
  hasJudgingTemplate: boolean;
}

interface EventContest {
  id: number;
  eventId: number;
  contestId: number;
  judgingTemplateId: number | null;
}

export default function SelectEventPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedContestId, setSelectedContestId] = useState<string>("");
  const [eventsWithContests, setEventsWithContests] = useState<Map<number, Contest[]>>(new Map());
  const router = useRouter();

  // Fetch events and contests on page load
  useEffect(() => {
    const fetchEventsAndContests = async () => {
      try {
        // Fetch events
        const eventsRes = await fetch('/api/events');
        if (!eventsRes.ok) throw new Error('Failed to fetch events');
        const eventsData = await eventsRes.json();
        
        // Fetch all contests for each event to see which have judging templates
        const contestsMap = new Map<number, Contest[]>();
        const eventPromises = eventsData.map(async (event: Event) => {
          const contestsRes = await fetch(`/api/events/${event.id}/contests`);
          if (!contestsRes.ok) return;
          
          const contestsData = await contestsRes.json();
          
          // For each contest, check if there's a judging template assigned
          const enhancedContests = await Promise.all(
            contestsData.map(async (contest: any) => {
              const eventContestRes = await fetch(`/api/events/${event.id}/contests/${contest.id}`);
              if (!eventContestRes.ok) return { ...contest, hasJudgingTemplate: false };
              
              const eventContestData = await eventContestRes.json();
              return {
                ...contest, 
                hasJudgingTemplate: eventContestData.judgingTemplateId !== null 
              };
            })
          );
          
          // Filter to include only contests with judging templates
          const judgingContests = enhancedContests.filter((c: Contest) => c.hasJudgingTemplate);
          if (judgingContests.length > 0) {
            contestsMap.set(event.id, judgingContests);
          }
        });
        
        await Promise.all(eventPromises);
        
        // Filter events to only those that have contests with judging templates
        const filteredEvents = eventsData.filter((event: Event) => contestsMap.has(event.id));
        
        setEvents(filteredEvents);
        setEventsWithContests(contestsMap);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching events and contests:', error);
        toast.error('Failed to load events and contests');
        setLoading(false);
      }
    };

    fetchEventsAndContests();
  }, []);

  // Update contests when event selection changes
  useEffect(() => {
    if (selectedEventId) {
      const eventContests = eventsWithContests.get(parseInt(selectedEventId)) || [];
      setContests(eventContests);
      setSelectedContestId("");
    } else {
      setContests([]);
    }
  }, [selectedEventId, eventsWithContests]);

  const handleContinue = () => {
    if (!selectedEventId || !selectedContestId) {
      toast.error('Please select both an event and contest');
      return;
    }
    
    router.push(`/organizer/judging/teams?eventId=${selectedEventId}&contestId=${selectedContestId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading available events and contests...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader
          title="Select Event & Contest"
          description="Choose which event and contest you want to judge"
        />
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle>No Events Available</CardTitle>
            <CardDescription>
              There are no events with contests that have judging templates assigned.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push('/organizer/judging')}>
              Back to Judging Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/organizer/judging-templates')}>
              Manage Judging Templates
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="Select Event & Contest"
        description="Choose which event and contest you want to judge"
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Judging Assignment</CardTitle>
          <CardDescription>
            Select the event and contest you want to judge. Only events and contests with assigned judging templates are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Select Event
            </label>
            <Select 
              value={selectedEventId} 
              onValueChange={setSelectedEventId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Select Contest
            </label>
            <Select 
              value={selectedContestId} 
              onValueChange={setSelectedContestId}
              disabled={!selectedEventId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedEventId ? "Select a contest" : "First select an event"} />
              </SelectTrigger>
              <SelectContent>
                {contests.map((contest) => (
                  <SelectItem key={contest.id} value={contest.id.toString()}>
                    {contest.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => router.push('/organizer/judging')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedEventId || !selectedContestId}
            className="gap-2"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
