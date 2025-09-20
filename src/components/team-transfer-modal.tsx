'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, Calendar, MapPin, Users, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  contestName: string;
  contestCode: string;
  contingentName: string;
  institutionName: string;
  stateName: string;
}

interface Event {
  id: number;
  name: string;
  scopeArea: string;
  startDate: string;
  endDate: string;
  status: string;
  contestCount: number;
}

interface TransferData {
  team: Team;
  currentEvent: {
    id: number;
    name: string;
    scopeArea: string;
  };
  eligibleEvents: Event[];
}

interface TeamTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  teamId: number;
  teamName: string;
  onTransferComplete: () => void;
}

export default function TeamTransferModal({
  isOpen,
  onClose,
  eventId,
  teamId,
  teamName,
  onTransferComplete
}: TeamTransferModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && !transferData && !loading) {
      console.log('Modal opened, fetching eligible events...');
      fetchEligibleEvents();
    }
  }, [isOpen]);

  const fetchEligibleEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching eligible events for:', { eventId, teamId });
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/dday-changes/team/${teamId}/transfer`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch eligible events');
      }
      
      const data = await response.json();
      console.log('Transfer data received:', data);
      setTransferData(data);
    } catch (error) {
      console.error('Error fetching eligible events:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load eligible events for transfer";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedEventId) return;

    setTransferring(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/dday-changes/team/${teamId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetEventId: selectedEventId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transfer team');
      }

      toast({
        title: "Success",
        description: "Team transferred successfully",
        variant: "default",
      });

      onTransferComplete();
      onClose();
    } catch (error) {
      console.error('Error transferring team:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transfer team",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && !transferData) {
      fetchEligibleEvents();
    } else if (!open) {
      setTransferData(null);
      setSelectedEventId(null);
      setError(null);
      onClose();
    }
  };

  const getScopeAreaColor = (scopeArea: string) => {
    switch (scopeArea) {
      case 'ZONE': return 'bg-blue-100 text-blue-800';
      case 'STATE': return 'bg-green-100 text-green-800';
      case 'NATIONAL': return 'bg-purple-100 text-purple-800';
      case 'OPEN': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transfer Team to Another Event
          </DialogTitle>
          <DialogDescription>
            Move "{teamName}" to another event that offers the same contest
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading eligible events...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2 text-red-600">Error Loading Events</h4>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button 
                onClick={fetchEligibleEvents}
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : transferData ? (
          <div className="space-y-6">
            {/* Team Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Team Name</div>
                    <div className="font-medium">{transferData.team.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Contest</div>
                    <div className="font-medium">{transferData.team.contestName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Contingent</div>
                    <div className="font-medium">{transferData.team.contingentName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Institution</div>
                    <div className="font-medium">{transferData.team.institutionName}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Event */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{transferData.currentEvent.name}</div>
                    <Badge className={getScopeAreaColor(transferData.currentEvent.scopeArea)}>
                      {transferData.currentEvent.scopeArea}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Eligible Events */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Target Event</h3>
              <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">All Available Events Shown</p>
                    <p className="text-xs text-blue-600 mt-1">
                      All events offering the same contest are shown, regardless of scope area (ZONE/STATE/NATIONAL) or event status.
                    </p>
                  </div>
                </div>
              </div>
              {transferData.eligibleEvents.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h4 className="text-lg font-medium mb-2">No Eligible Events Found</h4>
                      <p className="text-muted-foreground">
                        There are no other events that offer the same contest.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {transferData.eligibleEvents.map((event) => (
                    <Card 
                      key={event.id} 
                      className={`cursor-pointer transition-all ${
                        selectedEventId === event.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium">{event.name}</h4>
                              <Badge className={getScopeAreaColor(event.scopeArea)}>
                                {event.scopeArea}
                              </Badge>
                              <Badge variant="outline">
                                {event.contestCount} contest{event.contestCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                              </div>
                              <Badge variant={event.status === 'OPEN' ? 'default' : 'secondary'}>
                                {event.status}
                              </Badge>
                            </div>
                          </div>
                          {selectedEventId === event.id && (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer Button */}
            {transferData.eligibleEvents.length > 0 && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleTransfer}
                  disabled={!selectedEventId || transferring}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Transfer Team
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
