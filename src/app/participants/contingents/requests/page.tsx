"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, ArrowLeft, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface ContingentRequest {
  id: number;
  contingentId: number;
  participantId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  participant: {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
    gender?: string;
  };
  contingent: {
    id: number;
    name: string;
    description?: string;
  };
}

export default function ContingentRequestsPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<ContingentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [error, setError] = useState<string | null>(null);
  
  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/participants/auth/login");
    }
  }, [status]);
  
  // Fetch contingent requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (!session?.user?.id) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // First, get the contingents where the user is a manager
        const contingentsResponse = await fetch(`/api/participants/contingents?userId=${session.user.id}`);
        
        if (!contingentsResponse.ok) {
          throw new Error("Failed to fetch contingents");
        }
        
        const contingents = await contingentsResponse.json();
        const managedContingents = contingents.filter((c: any) => c.isManager);
        
        if (managedContingents.length === 0) {
          setRequests([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch requests for each managed contingent
        const allRequests: ContingentRequest[] = [];
        
        for (const contingent of managedContingents) {
          const requestsResponse = await fetch(`/api/participants/contingent-requests?contingentId=${contingent.id}`);
          
          if (requestsResponse.ok) {
            const contingentRequests = await requestsResponse.json();
            allRequests.push(...contingentRequests);
          }
        }
        
        setRequests(allRequests);
      } catch (error) {
        console.error("Error fetching contingent requests:", error);
        setError("Failed to load contingent requests. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRequests();
  }, [session]);
  
  // Handle request approval/rejection
  const handleRequestAction = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/participants/contingent-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${status.toLowerCase()} request`);
      }
      
      // Update the local state
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status } : req
      ));
      
      toast.success(`Request ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      console.error(`Error ${status.toLowerCase()}ing request:`, error);
      toast.error(error.message || `Failed to ${status.toLowerCase()} request`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter requests by status
  const pendingRequests = requests.filter(req => req.status === "PENDING");
  const approvedRequests = requests.filter(req => req.status === "APPROVED");
  const rejectedRequests = requests.filter(req => req.status === "REJECTED");
  
  if (status === "loading" || !session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contingent Join Requests</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage requests from participants who want to join your contingents
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/participants/contingents">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contingents
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500/10 absolute -top-2 -right-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="text-center text-destructive">{error}</div>
              </CardContent>
            </Card>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p>No pending join requests</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-medium">{request.participant.name}</h3>
                          <Badge variant="outline" className="bg-amber-500/10">Pending</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{request.participant.email}</p>
                        {request.participant.phoneNumber && (
                          <p className="text-sm text-muted-foreground">Phone: {request.participant.phoneNumber}</p>
                        )}
                        <div className="mt-2">
                          <p className="text-sm">
                            <span className="font-medium">Contingent:</span> {request.contingent.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Requested on {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end md:self-center">
                        <Button 
                          variant="outline" 
                          className="h-9"
                          onClick={() => handleRequestAction(request.id, 'REJECTED')}
                          disabled={isLoading}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          className="h-9"
                          onClick={() => handleRequestAction(request.id, 'APPROVED')}
                          disabled={isLoading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p>No approved join requests</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-medium">{request.participant.name}</h3>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">Approved</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{request.participant.email}</p>
                        <div className="mt-2">
                          <p className="text-sm">
                            <span className="font-medium">Contingent:</span> {request.contingent.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Approved on {new Date(request.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="rejected" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <XCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p>No rejected join requests</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-medium">{request.participant.name}</h3>
                          <Badge variant="outline" className="bg-destructive/10 text-destructive">Rejected</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{request.participant.email}</p>
                        <div className="mt-2">
                          <p className="text-sm">
                            <span className="font-medium">Contingent:</span> {request.contingent.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rejected on {new Date(request.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
