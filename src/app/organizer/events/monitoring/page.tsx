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

type Event = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  scopeArea: string;
  zoneId: number | null;
  zoneName: string | null;
  stateId: number | null;
  stateName: string | null;
};

export default function MonitoringPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
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
      const response = await fetch("/api/organizer/events/all");
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events. Please try again later.",
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
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No events found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  // Check if this is an online event
                  const isOnlineEvent = event.scopeArea.startsWith('ONLINE_');
                  
                  return (
                  <TableRow 
                    key={event.id} 
                    className={isOnlineEvent ? 'bg-blue-50 hover:bg-blue-100' : ''}
                  >
                    <TableCell className="font-medium">
                      <div>{event.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.startDate), 'dd MMM yyyy')} - {format(new Date(event.endDate), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${event.scopeArea === 'ZONE' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${event.scopeArea === 'STATE' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                        ${event.scopeArea === 'NATIONAL' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                        ${event.scopeArea === 'OPEN' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                        ${event.scopeArea === 'ONLINE_ZONE' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : ''}
                        ${event.scopeArea === 'ONLINE_STATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                        ${event.scopeArea === 'ONLINE_NATIONAL' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}
                        ${event.scopeArea === 'ONLINE_OPEN' ? 'bg-pink-50 text-pink-700 border-pink-200' : ''}
                      `}>
                        {event.scopeArea.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(event.scopeArea === 'ZONE' || event.scopeArea === 'ONLINE_ZONE') && event.zoneName ? (
                        <span className="text-sm">{event.zoneName}</span>
                      ) : (event.scopeArea === 'STATE' || event.scopeArea === 'ONLINE_STATE') && event.stateName ? (
                        <span className="text-sm">{event.stateName}</span>
                      ) : (event.scopeArea === 'NATIONAL' || event.scopeArea === 'ONLINE_NATIONAL') ? (
                        <span className="text-sm text-muted-foreground">National</span>
                      ) : (event.scopeArea === 'OPEN' || event.scopeArea === 'ONLINE_OPEN') ? (
                        <span className="text-sm text-muted-foreground">Open</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {actionInProgress !== event.id && (event.status === "OPEN" || event.status === "CUTOFF_REGISTRATION") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusToggleClick(event.id, event.status)}
                            title={event.status === "OPEN" ? "Cutoff Registration" : "Reset to Open"}
                            className={event.status === "OPEN" ? "bg-green-600 text-white hover:bg-green-700" : "bg-amber-600 text-white hover:bg-amber-700"}
                          >
                            {event.status}
                          </Button>
                        ) : actionInProgress === event.id ? (
                          <Button variant="outline" size="sm" disabled>
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{calculateDaysToEvent(event.startDate)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => router.push(`/organizer/events/monitoring/token/${event.id}`)}
                        title="Manage Tokens"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ticket"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
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
                        {event.status === "CUTOFF_REGISTRATION" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/organizer/events/${event.id}/attendance`)}
                            title="Go to Attendance"
                            className="text-green-600 hover:text-green-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-check"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
                          </Button>
                        )}
                      </div>
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
