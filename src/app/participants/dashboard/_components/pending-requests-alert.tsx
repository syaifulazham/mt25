"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle, XCircle, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PendingRequestsAlertProps {
  userId: number; // For backward compatibility
  participantId?: number;
}

interface PendingRequest {
  id: number;
  userId: number;
  contingentId: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  contingentName?: string; // Optional field for displaying contingent context
}

export default function PendingRequestsAlert({ userId, participantId }: PendingRequestsAlertProps) {
  // If participantId is provided, use it; otherwise use userId as fallback
  const id = participantId || userId;
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const previousRequestCountRef = useRef<number>(0);

  // Function to request browser notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  };
  
  // Function to show browser notification
  const showBrowserNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      // Create and show the notification
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico' // Use your app's favicon or a custom icon
      });
      
      // Handle notification click
      notification.onclick = () => {
        window.focus();
        window.location.href = '/participants/contingents';
        notification.close();
      };
    }
  };
  
  useEffect(() => {
    // Request notification permission when component mounts
    requestNotificationPermission();
  }, []);
  
  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching pending requests for participant ID:", id);
        
        // First, get the contingents where the participant is a manager
        const contingentsResponse = await fetch(`/api/participants/contingents?participantId=${id}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!contingentsResponse.ok) {
          throw new Error("Failed to fetch contingents");
        }
        
        const contingents = await contingentsResponse.json();
        console.log("All contingents:", contingents);
        
        // Filter for contingents where the participant is a manager
        // Make sure to include both the old and new manager relationship models
        const managedContingents = contingents.filter((c: any) => c.isManager || c.isOwner);
        console.log("Managed contingents:", managedContingents);
        
        // Log detailed information about each contingent for debugging
        contingents.forEach((c: any) => {
          console.log(`Contingent ${c.id} - ${c.name}: isManager=${c.isManager}, isOwner=${c.isOwner}, managedByParticipant=${c.managedByParticipant}`);
        });
        
        if (managedContingents.length === 0) {
          // Participant is not managing any contingents
          console.log("Participant is not managing any contingents");
          setPendingRequests([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch pending requests for each managed contingent
        const allRequests: PendingRequest[] = [];
        
        for (const contingent of managedContingents) {
          console.log(`Fetching requests for contingent ${contingent.id}`);
          const requestsResponse = await fetch(`/api/participants/contingent-requests?contingentId=${contingent.id}`);
          
          if (requestsResponse.ok) {
            const requests = await requestsResponse.json();
            console.log(`Found ${requests.length} requests for contingent ${contingent.id}:`, requests);
            
            // Add contingent information to each request for better context
            const requestsWithContingent = requests.map((req: any) => ({
              ...req,
              contingentName: contingent.name
            }));
            
            allRequests.push(...requestsWithContingent);
          } else {
            console.error(`Error fetching requests for contingent ${contingent.id}:`, await requestsResponse.text());
            
            // Try to get more detailed error information
            try {
              const errorData = await requestsResponse.json();
              console.error('Detailed error:', errorData);
            } catch (e) {
              // If we can't parse the error as JSON, just log the status
              console.error('Response status:', requestsResponse.status);
            }
          }
        }
        
        console.log("Total pending requests found:", allRequests.length);
        
        // Check if there are new requests since last check
        if (previousRequestCountRef.current < allRequests.length && previousRequestCountRef.current > 0) {
          // There are new requests
          setShowNotification(true);
          
          // Show browser notification if permission is granted
          const newRequestsCount = allRequests.length - previousRequestCountRef.current;
          showBrowserNotification(
            'New Join Requests', 
            `You have ${newRequestsCount} new request${newRequestsCount > 1 ? 's' : ''} to join your contingent`
          );
          
          // Also show a toast notification
          toast("New join requests", {
            description: `You have ${newRequestsCount} new request${newRequestsCount > 1 ? 's' : ''} to join your contingent`,
            action: {
              label: "View",
              onClick: () => window.location.href = '/participants/contingents'
            }
          });
        }
        
        // Update the reference count for next comparison
        previousRequestCountRef.current = allRequests.length;
        
        setPendingRequests(allRequests);
      } catch (error) {
        console.error("Error fetching pending requests:", error);
        setError("Could not load pending join requests");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingRequests();
    
    // Set up an interval to check for new requests periodically
    const intervalId = setInterval(() => {
      fetchPendingRequests();
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [id]);

  // Track which request is being processed
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  
  // Function to handle request approval/rejection
  const handleRequestAction = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      // Set the current request as processing
      setProcessingRequestId(requestId);
      
      // Show a loading toast
      const toastId = toast.loading(
        status === 'APPROVED' ? 'Approving request...' : 'Rejecting request...'
      );
      
      const response = await fetch(`/api/participants/contingent-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to ${status.toLowerCase()} request`);
      }
      
      // Update the local state to remove the handled request
      setPendingRequests(pendingRequests.filter(req => req.id !== requestId));
      
      // Find the request details for the success message
      const request = pendingRequests.find(req => req.id === requestId);
      const userName = request?.user.name || 'User';
      
      // Dismiss the loading toast and show a success toast
      toast.dismiss(toastId);
      toast.success(
        status === 'APPROVED' 
          ? `${userName} has been approved and added as a co-manager` 
          : `${userName}'s request has been rejected`,
        {
          duration: 5000,
          description: status === 'APPROVED' 
            ? 'They can now help manage the contingent and register contestants' 
            : 'They will be notified that their request was not approved'
        }
      );
    } catch (error: any) {
      console.error(`Error ${status === 'APPROVED' ? 'approving' : 'rejecting'} request:`, error);
      toast.error(error.message || `Failed to ${status === 'APPROVED' ? 'approve' : 'reject'} request`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[250px] mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Requests
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return null; // Don't show anything if there are no pending requests
  }

  // Show notification for pending requests
  return (
    <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-md animate-pulse-slow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500 animate-pulse" />
          Pending Join Requests
          <Badge variant="secondary" className="ml-2 bg-amber-500 text-white">
            {pendingRequests.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Users waiting for approval to join your contingent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingRequests.slice(0, 3).map((request) => (
            <div key={request.id} className="p-3 border rounded-md flex items-center justify-between">
              <div>
                <p className="font-medium">{request.user.name}</p>
                <p className="text-sm text-muted-foreground">{request.user.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Requested {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {request.contingentName && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded-full">
                      For: {request.contingentName}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8"
                  onClick={() => handleRequestAction(request.id, 'REJECTED')}
                  disabled={processingRequestId !== null}
                >
                  {processingRequestId === request.id ? (
                    <span className="flex items-center">
                      <span className="h-3 w-3 mr-2 rounded-full border-2 border-t-transparent border-current animate-spin"></span>
                      Rejecting...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </span>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  className="h-8"
                  onClick={() => handleRequestAction(request.id, 'APPROVED')}
                  disabled={processingRequestId !== null}
                >
                  {processingRequestId === request.id ? (
                    <span className="flex items-center">
                      <span className="h-3 w-3 mr-2 rounded-full border-2 border-t-transparent border-current animate-spin"></span>
                      Approving...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
          
          {pendingRequests.length > 3 && (
            <Button asChild variant="ghost" className="w-full">
              <Link href="/participants/contingents">
                View all {pendingRequests.length} requests <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
          
          {/* Information about managing requests */}
          <Alert className="mt-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <AlertTitle className="text-sm font-medium flex items-center">
              <Bell className="h-4 w-4 mr-2 text-blue-500" />
              Why are these important?
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Approving join requests allows users to become co-managers of your contingent and register contestants for the Techlympics competition.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
