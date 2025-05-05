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
import { useLanguage } from "@/lib/i18n/language-context";

interface PendingRequestsAlertProps {
  userId: number;
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
  contingentName?: string;
}

export default function PendingRequestsAlertClient({ userId, participantId }: PendingRequestsAlertProps) {
  const { t } = useLanguage();
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

  // Function to show a browser notification
  const showBrowserNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico', // Use your app's favicon or a relevant icon
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, fetch the contingents that this participant manages
      const contingentsResponse = await fetch(`/api/participants/contingents?participantId=${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!contingentsResponse.ok) {
        // If we can't get contingents, just show empty state
        console.error(`Failed to fetch contingents: ${contingentsResponse.status}`);
        setPendingRequests([]);
        setIsLoading(false);
        return;
      }
      
      const contingents = await contingentsResponse.json();
      
      // Filter to only include contingents where the user is a manager
      const managedContingents = contingents.filter((contingent: any) => 
        contingent.isManager || contingent.isOwner
      );
      
      if (managedContingents.length === 0) {
        // User doesn't manage any contingents, so no requests to show
        setPendingRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Now fetch pending requests for each contingent
      const allRequests: PendingRequest[] = [];
      
      // Use Promise.all for parallel fetching
      await Promise.all(managedContingents.map(async (contingent: any) => {
        try {
          const requestsResponse = await fetch(`/api/participants/contingent-requests?contingentId=${contingent.id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            credentials: 'include'
          });
          
          if (requestsResponse.ok) {
            const contingentRequests = await requestsResponse.json();
            allRequests.push(...contingentRequests);
          }
        } catch (e) {
          console.error(`Error fetching requests for contingent ${contingent.id}:`, e);
        }
      }));
      
      setPendingRequests(allRequests);
      
      // Check if we need to show a notification
      if (previousRequestCountRef.current > 0 && allRequests.length > previousRequestCountRef.current) {
        setShowNotification(true);
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          showBrowserNotification(
            t('requests.new_request_title'),
            t('requests.new_request_body')
          );
        }
        toast.info(t('requests.new_request_toast'));
      }
      
      previousRequestCountRef.current = allRequests.length;
    } catch (err) {
      console.error("Error fetching pending requests:", err);
      // Don't show error message to user, just empty state
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // Poll for new requests every minute
    const interval = setInterval(() => {
      fetchPendingRequests();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [id]);

  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch(`/api/participants/contingent-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      
      if (!response.ok) {
        throw new Error(`${t('requests.error_approving')}: ${response.status}`);
      }
      
      // Update local state
      setPendingRequests(pendingRequests.filter(request => request.id !== requestId));
      toast.success(t('requests.approval_success'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      const response = await fetch(`/api/participants/contingent-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      
      if (!response.ok) {
        throw new Error(`${t('requests.error_rejecting')}: ${response.status}`);
      }
      
      // Update local state
      setPendingRequests(pendingRequests.filter(request => request.id !== requestId));
      toast.success(t('requests.rejection_success'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('common.error')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // If there are no pending requests, don't render anything
  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-medium text-amber-700">
              {t('requests.pending_requests')} 
              <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </div>
          <Button variant="link" size="sm" className="h-6 p-0" asChild>
            <Link href="/participants/contingent">
              {t('requests.view_all')} <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <CardDescription className="text-amber-700/80 text-xs">
          {t('requests.requires_attention')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800 text-xs flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <div className="font-medium">{request.user.name}</div>
                <div className="flex items-center gap-1 text-amber-600">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(request.createdAt).toLocaleDateString()} | {t('requests.status')}: {t(`requests.${request.status.toLowerCase()}`)}
                  </span>
                </div>
              </div>
              <div className="text-muted-foreground">{request.user.email}</div>
              <div className="mt-1 flex justify-end gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 px-2 py-0 text-[10px] border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleReject(request.id)}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  {t('requests.reject')}
                </Button>
                <Button 
                  size="sm" 
                  className="h-7 px-2 py-0 text-[10px] bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(request.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('requests.approve')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
