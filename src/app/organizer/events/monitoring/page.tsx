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
import { Eye, AlertTriangle, Users } from "lucide-react";
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
  const [confirmDialog, setConfirmDialog] = useState<{ 
    show: boolean; 
    eventId: number | null; 
    currentStatus: string; 
    verificationCode?: string; 
    userInput?: string;
  }>({ 
    show: false, 
    eventId: null, 
    currentStatus: '', 
    verificationCode: '',
    userInput: ''
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

  // Generate random alphanumeric string of specified length
  const generateRandomString = (length: number): string => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleStatusToggleClick = (eventId: number, currentStatus: string) => {
    // Show confirmation dialog when changing from OPEN to CUTOFF_REGISTRATION
    if (currentStatus === "OPEN") {
      setConfirmDialog({
        show: true,
        eventId,
        currentStatus,
        verificationCode: generateRandomString(5),
        userInput: ''
      });
    } else if (currentStatus === "CUTOFF_REGISTRATION") {
      // When changing from CUTOFF_REGISTRATION to OPEN, show verification code dialog
      setConfirmDialog({
        show: true,
        eventId,
        currentStatus,
        verificationCode: generateRandomString(5),
        userInput: ''
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
                  <TableHead>Event</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{event.zoneName}</TableCell>
                    <TableCell>
                      {format(new Date(event.startDate), 'dd MMM yyyy')} - {format(new Date(event.endDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(event.status)}>
                        {event.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{calculateDaysToEvent(event.startDate)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/organizer/events/monitoring/token/${event.id}`)}
                      >
                        Manage Tokens
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/organizer/events/monitoring/${event.id}/rawlist`)}
                          title="View Raw List"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {event.status === "CUTOFF_REGISTRATION" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/organizer/events/monitoring/${event.id}/endlist`)}
                            title="View End List"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
              {confirmDialog.currentStatus === "OPEN" ? "Confirm Registration Cutoff" : "Confirm Status Change"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.currentStatus === "OPEN" ? (
                <>
                  This will change the event status to CUTOFF_REGISTRATION and automatically approve all registered teams.
                  <br /><br />
                  <span className="font-bold">This action cannot be undone and will prevent new team registrations.</span>
                </>
              ) : (
                <>
                  This will change the event status from CUTOFF_REGISTRATION back to OPEN.
                  <br /><br />
                  <span className="font-bold">This action may affect team statuses and should be used with caution.</span>
                </>
              )}
              
              <div className="mt-4 p-3 border rounded bg-gray-50">
                <p className="text-sm font-medium mb-2">For security, please enter this verification code: <span className="font-mono bg-gray-200 px-1 rounded">{confirmDialog.verificationCode}</span></p>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter code here"
                    value={confirmDialog.userInput || ''}
                    onChange={(e) => setConfirmDialog(prev => ({ ...prev, userInput: e.target.value }))}
                    maxLength={5}
                  />
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, show: false, userInput: '' }))}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (confirmDialog.eventId && confirmDialog.currentStatus) {
                  if (confirmDialog.userInput === confirmDialog.verificationCode) {
                    toggleEventStatus(confirmDialog.eventId, confirmDialog.currentStatus);
                    setConfirmDialog(prev => ({ ...prev, userInput: '' }));
                  } else {
                    toast({
                      title: "Verification Failed",
                      description: "The verification code you entered is incorrect. Please try again.",
                      variant: "destructive",
                    });
                  }
                }
              }}
              className={`${confirmDialog.currentStatus === "OPEN" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
              disabled={!confirmDialog.userInput || confirmDialog.userInput.length !== 5}
            >
              {confirmDialog.currentStatus === "OPEN" ? "Confirm Cutoff" : "Change to Open"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
