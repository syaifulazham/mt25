"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  User,
  Calendar,
  Edit,
  Trash2,
  ArrowLeft,
  Users,
  CreditCard,
  Hash,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManagerData {
  id: number;
  name: string;
  ic: string;
  email: string | null;
  phoneNumber: string | null;
  hashcode: string;
  teamId: number | null;
  team: {
    id: number;
    name: string;
    hashcode: string;
    contestId: number;
    contestName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
}

export default function ManagerDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manager, setManager] = useState<ManagerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch manager data
  useEffect(() => {
    const fetchManager = async () => {
      try {
        const response = await fetch(`/api/participants/managers/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch manager");
        }
        const data = await response.json();
        setManager(data);
      } catch (error) {
        console.error("Error fetching manager:", error);
        toast.error("Failed to load manager details");
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchManager();
    }
  }, [status, params.id]);

  // Format IC number for display (masked for privacy)
  const formatIC = (ic: string) => {
    if (ic.length === 12) {
      return `${ic.substring(0, 6)}-XX-${ic.substring(10, 12)}`;
    }
    return ic;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-MY", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle manager deletion
  const handleDeleteManager = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/participants/managers/${params.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete manager");
      }
      
      toast.success("Manager deleted successfully");
      router.push("/participants/managers");
    } catch (error) {
      console.error("Error deleting manager:", error);
      toast.error("Failed to delete manager");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }

  return (
    <div className="container px-4 py-8 mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/participants/managers">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Managers
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      ) : manager ? (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <User className="h-6 w-6" />
                {manager.name}
              </h1>
              <p className="text-muted-foreground">
                Manager Details
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <Button variant="outline" asChild>
                <Link href={`/participants/managers/${manager.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Manager
                </Link>
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Manager
              </Button>
            </div>
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Manager Information</CardTitle>
                <CardDescription>
                  Personal details of the manager
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{manager.name}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">IC Number</div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{formatIC(manager.ic)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Email Address</div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {manager.email ? manager.email : <span className="text-muted-foreground italic">Not provided</span>}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Phone Number</div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {manager.phoneNumber ? manager.phoneNumber : <span className="text-muted-foreground italic">Not provided</span>}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Manager Hashcode</div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="font-mono">
                        {manager.hashcode}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Created On</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(manager.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Team Assignment</CardTitle>
                <CardDescription>
                  Team the manager is assigned to
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {manager.team ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex flex-col gap-3">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Team Name</div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{manager.team.name}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Team Code</div>
                          <div>
                            <Badge variant="outline" className="font-mono">
                              {manager.team.hashcode}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Contest</div>
                          <div>
                            <Badge variant="secondary">
                              {manager.team.contestName}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button variant="outline" size="sm" asChild className="w-full">
                          <Link href={`/participants/teams/${manager.team.id}`}>
                            View Team Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No Team Assigned</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      This manager is not assigned to any team yet.
                    </p>
                    <Button asChild>
                      <Link href={`/participants/managers/${manager.id}/edit`}>
                        Assign to Team
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Delete confirmation dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Manager</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the manager "{manager.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteManager}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete Manager"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Manager Not Found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            The manager you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/participants/managers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Managers
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
