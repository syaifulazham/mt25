import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Calendar, MapPin, Trophy, CheckCircle2, Loader2 } from "lucide-react";
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";

interface EventContestRegistration {
  id: number;
  eventId: number;
  eventName: string;
  contestId: number;
  contestName: string;
  maxteampercontingent: number;
  scopeArea: string;
  isRegistered: boolean;
  registration: {
    id: number;
    teamPriority: number;
    status: string;
  } | null;
  zoneEligible: string | null;
  stateEligible: string | null;
}

interface EventRegistrationsProps {
  teamId: number;
}

export default function EventRegistrations({ teamId }: EventRegistrationsProps) {
  const { t } = useLanguage();
  const [availableEvents, setAvailableEvents] = useState<EventContestRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningEventId, setJoiningEventId] = useState<number | null>(null);
  const [updatingPriorityId, setUpdatingPriorityId] = useState<number | null>(null);
  const [maxTeamExceededEvents, setMaxTeamExceededEvents] = useState<number[]>([]);

  // Fetch available event contests
  const fetchAvailableEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/participants/teams/${teamId}/available-events?t=${Date.now()}`, {
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-store, must-revalidate',
          'Cache': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch available events");
      }
      
      const data: EventContestRegistration[] = await response.json();
      setAvailableEvents(data);
    } catch (error) {
      console.error("Error fetching available events:", error);
      toast.error("Failed to load available events");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (teamId) {
      fetchAvailableEvents();
    }
  }, [teamId]);

  // Register for an event contest
  const registerForEvent = async (eventcontestId: number) => {
    try {
      setJoiningEventId(eventcontestId);
      
      const response = await fetch(`/api/participants/teams/${teamId}/event-registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventcontestId
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.error && data.error.includes("Maximum number of teams")) {
          // Add this event to the maxTeamExceededEvents list
          setMaxTeamExceededEvents(prev => [...prev, eventcontestId]);
        }
        throw new Error(data.error || "Failed to register for event");
      }
      
      toast.success("Successfully registered for event");
      fetchAvailableEvents(); // Refresh the list
    } catch (error: any) {
      console.error("Error registering for event:", error);
      toast.error(error.message || "Failed to register for event");
    } finally {
      setJoiningEventId(null);
    }
  };

  // Update team priority
  const updateTeamPriority = async (eventcontestId: number, teamPriority: number) => {
    try {
      setUpdatingPriorityId(eventcontestId);
      
      const response = await fetch(`/api/participants/teams/${teamId}/event-registrations`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventcontestId,
          teamPriority
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update team priority");
      }
      
      toast.success("Team priority updated successfully");
      fetchAvailableEvents(); // Refresh the list
    } catch (error: any) {
      console.error("Error updating team priority:", error);
      toast.error(error.message || "Failed to update team priority");
    } finally {
      setUpdatingPriorityId(null);
    }
  };

  // Withdraw from an event
  const withdrawFromEvent = async (eventcontestId: number) => {
    try {
      setUpdatingPriorityId(eventcontestId);
      
      const response = await fetch(`/api/participants/teams/${teamId}/event-registrations?eventcontestId=${eventcontestId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to withdraw from event");
      }
      
      toast.success("Successfully withdrawn from event");
      fetchAvailableEvents(); // Refresh the list
    } catch (error: any) {
      console.error("Error withdrawing from event:", error);
      toast.error(error.message || "Failed to withdraw from event");
    } finally {
      setUpdatingPriorityId(null);
    }
  };

  // Helper function to get a badge color based on scope area
  const getScopeAreaColor = (scopeArea: string) => {
    switch (scopeArea) {
      case 'OPEN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ZONE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STATE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('teams.event_registrations')}</CardTitle>
        <CardDescription>
          {t('teams.event_registrations_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : availableEvents.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium">{t('teams.no_available_events')}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              {t('teams.no_available_events_description')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-slate-50 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base truncate">{event.eventName}</CardTitle>
                      <CardDescription className="truncate">{event.contestName}</CardDescription>
                    </div>
                    <Badge className={getScopeAreaColor(event.scopeArea)}>
                      {event.scopeArea}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 pb-4">
                  {/* Location information - show for ZONE and STATE events */}
                  {(event.scopeArea === 'ZONE' && event.zoneEligible) && (
                    <div className="flex items-center text-sm mb-2">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>Zone: <span className="font-medium">{event.zoneEligible}</span></span>
                    </div>
                  )}
                  
                  {(event.scopeArea === 'STATE' && event.stateEligible) && (
                    <div className="flex items-center text-sm mb-2">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>State: <span className="font-medium">{event.stateEligible}</span></span>
                    </div>
                  )}
                  
                  {/* Team limit information */}
                  <div className="flex items-center text-sm mb-3">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <span>{t('teams.max_teams_per_contingent').replace('{count}', event.maxteampercontingent.toString())}</span>
                  </div>
                  
                  {/* Team Priority selector or Join button */}
                  {!event.isRegistered ? (
                    <div className="mt-3">
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        onClick={() => registerForEvent(event.id)}
                        disabled={joiningEventId === event.id || maxTeamExceededEvents.includes(event.id)}
                      >
                        {joiningEventId === event.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            {t('teams.joining')}
                          </>
                        ) : maxTeamExceededEvents.includes(event.id) ? (
                          <>{t('teams.maximum_exceeded')}</>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> 
                            {t('teams.join_event')}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {event.scopeArea === 'ZONE' && event.zoneEligible ? (
                          `This competition is available for Zone ${event.zoneEligible}`
                        ) : event.scopeArea === 'STATE' && event.stateEligible ? (
                          `This competition is available for ${event.stateEligible}`
                        ) : (
                          'This competition is open to all'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm">
                        {t('teams.select_team_priority')} 
                        <span className="text-xs text-muted-foreground ml-1">
                          (0-{event.maxteampercontingent})
                        </span>
                      </p>
                      
                      <ToggleGroup 
                        type="single" 
                        className="justify-center"
                        value={event.registration?.teamPriority.toString() || "0"}
                        onValueChange={(value: string) => {
                          if (value) {
                            updateTeamPriority(event.id, parseInt(value));
                          }
                        }}
                        disabled={updatingPriorityId === event.id}
                      >
                        {Array.from({length: event.maxteampercontingent + 1}, (_, i) => (
                          <ToggleGroupItem 
                            key={i} 
                            value={i.toString()} 
                            className="w-9 h-9"
                          >
                            {i}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => withdrawFromEvent(event.id)}
                          disabled={updatingPriorityId === event.id}
                        >
                          {updatingPriorityId === event.id ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 
                              {t('teams.processing')}
                            </>
                          ) : (
                            t('teams.withdraw')
                          )}
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        {event.registration?.teamPriority === 0 ? (
                          "Priority not set (0 means not yet determined)"
                        ) : (
                          `Priority: ${event.registration?.teamPriority} of ${event.maxteampercontingent}`
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
