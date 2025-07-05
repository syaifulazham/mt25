"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

// Simple loading spinner component
function LoadingSpinner({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const sizeClass = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  }[size];
  
  return <Loader2 className={`${sizeClass} animate-spin`} />;
}

type ZoneEvent = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  zoneId: number;
  zoneName: string;
};

export default function MonitoringPage() {
  const router = useRouter();
  const [events, setEvents] = useState<ZoneEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; eventId: number | null; currentStatus: string }>({ 
    show: false, 
    eventId: null, 
    currentStatus: '' 
  });
  
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/organizer/events/zone");
      if (!response.ok) {
        throw new Error("Failed to fetch zone events");
      }
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load zone events. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const calculateDaysToEvent = (startDate: string) => {
    const today = new Date();
    const eventDate = new Date(startDate);
    return differenceInDays(eventDate, today);
  };

  const handleStatusToggleClick = (eventId: number, currentStatus: string) => {
    // Show confirmation dialog when changing from OPEN to CUTOFF_REGISTRATION
    if (currentStatus === "OPEN") {
      setConfirmDialog({
        show: true,
        eventId,
        currentStatus
      });
    } else {
      // For other status changes, proceed directly
      toggleEventStatus(eventId, currentStatus);
    }
  };

  const toggleEventStatus = async (eventId: number, currentStatus: string) => {
    setActionInProgress(eventId);
    const newStatus = currentStatus === "OPEN" ? "CUTOFF_REGISTRATION" : "OPEN";
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update event status");
      }
      
      // Update local state
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, status: newStatus } : event
      ));
      
      toast({
        title: "Success",
        description: `Event status changed to ${newStatus}`,
      });
      
      // If we just changed to CUTOFF_REGISTRATION, show additional toast about team status updates
      if (newStatus === "CUTOFF_REGISTRATION") {
        toast({
          title: "Teams Updated",
          description: "All registered teams have been automatically approved.",
        });
      }
    } catch (error) {
      console.error("Error updating event status:", error);
      toast({
        title: "Error",
        description: "Failed to update event status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
      // Close dialog if it was open
      setConfirmDialog(prev => ({ ...prev, show: false }));
    }
  };

  const viewEventStats = (zoneId: number) => {
    router.push(`/organizer/events/stats/${zoneId}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "CUTOFF_REGISTRATION":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case "CLOSED":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
      <PageHeader
        title="Event Monitoring"
        description="Monitor and manage ZONE events"
      />

      <div className="space-y-4">
        <div className="rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">No zone events found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Start Date</TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Days to D-Day</TableHead>
                  <TableHead>Registration Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const daysToEvent = calculateDaysToEvent(event.startDate);
                  const isPast = daysToEvent < 0;
                  
                  return (
                    <TableRow key={event.id}>
                      <TableCell>{format(new Date(event.startDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-xs text-muted-foreground">Zone: {event.zoneName}</div>
                      </TableCell>
                      <TableCell>
                        {isPast ? (
                          <Badge variant="outline" className="bg-gray-100">
                            Past Event
                          </Badge>
                        ) : (
                          <Badge variant={daysToEvent <= 7 ? "destructive" : "outline"}>
                            {daysToEvent} days
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggleClick(event.id, event.status)}
                          disabled={actionInProgress === event.id}
                          className={getStatusBadgeColor(event.status)}
                        >
                          {actionInProgress === event.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            event.status === "OPEN" ? "OPEN" : "CUTOFF"
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewEventStats(event.zoneId)}
                          title="View Statistics"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.show} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, show: open }))}>        
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Registration Cutoff
            </DialogTitle>
            <DialogDescription>
              This will change the event status to CUTOFF_REGISTRATION and automatically approve all registered teams.
              <br /><br />
              <span className="font-bold">This action cannot be undone and will prevent new team registrations.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmDialog.eventId && toggleEventStatus(confirmDialog.eventId, confirmDialog.currentStatus)}
              disabled={actionInProgress === confirmDialog.eventId}
            >
              {actionInProgress === confirmDialog.eventId ? <LoadingSpinner size="sm" /> : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
