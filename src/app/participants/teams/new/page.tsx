"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Save, Trophy, Users, School, Building } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Contingent {
  id: number;
  name: string;
  school?: {
    name: string;
  };
  higherInstitution?: {
    name: string;
  };
  isManager: boolean;
  isOwner: boolean;
}

interface Contest {
  id: number;
  name: string;
  code: string;
  contestType: string;
  startDate: string;
  endDate: string;
  description?: string;
  participation_mode: string;
}

export default function NewTeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contingents, setContingents] = useState<Contingent[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contestId: "",
    contingentId: ""
  });
  
  // Fetch the user's contingents
  useEffect(() => {
    const fetchUserContingents = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        const participantId = session.user.id;
        const response = await fetch(`/api/participants/contingents?participantId=${participantId}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch contingents");
        }
        
        const data = await response.json();
        console.log("Contingent data loaded:", data);
        
        // Find contingents where the user is a manager
        const managedContingents = data.filter((c: any) => c.isManager && c.status === 'ACTIVE');
        
        if (managedContingents.length > 0) {
          setContingents(managedContingents);
          
          // Always use the first managed contingent (if a user can only manage one contingent)
          setFormData(prev => ({
            ...prev,
            contingentId: managedContingents[0].id.toString()
          }));
        } else {
          toast.error("You need to be a manager of a contingent to create a team");
          router.push('/participants/contingents');
        }
      } catch (error) {
        console.error("Error fetching user contingents:", error);
        toast.error("Failed to load your contingent information");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserContingents();
  }, [session, router]);
  
  // Fetch available contests
  useEffect(() => {
    const fetchContests = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        console.log("Starting to fetch contests...");
        
        // Use the participant-specific contests API endpoint
        const url = '/api/participants/contests?participation_mode=TEAM';
        console.log("Fetching from URL:", url);
        
        // Use simple fetch without additional headers
        const response = await fetch(url);
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error(`Failed to fetch contests: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Available contests:", data);
        
        console.log("Checking contests for team participation mode...");
        
        // Filter for team contests (regardless of date)
        // Include resilient fallback logic in case participation_mode isn't available yet
        const teamContests = data.filter((c: any) => {
          // Check if it has participation_mode field
          if (c.participation_mode) {
            return c.participation_mode === "TEAM";
          }
          
          // Fallback for contests without the field: use contest types known to be team-based
          // This is helpful during the transition period before all contests have the field
          return c.contestType && [
            "CODING", 
            "STRUCTURE_BUILDING", 
            "SCIENCE_PROJECT", 
            "ENGINEERING_DESIGN", 
            "ANALYSIS_CHALLENGE"
          ].includes(c.contestType);
        });
        
        console.log("Found", teamContests.length, "team contests");
        
        setContests(teamContests);
      } catch (error) {
        console.error("Error fetching contests:", error);
        toast.error("Failed to load available contests. Please try refreshing the page.");
        
        // Try to provide the most helpful information to developers in console
        if (error instanceof Error) {
          console.error("Error details:", error.message, error.stack);
        }
        
        // Set empty contests array but don't block the UI completely
        setContests([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContests();
  }, [session]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.contestId) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Ensure contingentId is set
    if (!formData.contingentId && contingents.length > 0) {
      setFormData(prev => ({ ...prev, contingentId: contingents[0].id.toString() }));
    }
    
    if (!formData.contingentId) {
      toast.error("You need to have a contingent to create a team");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const submissionData = {
        ...formData,
        participantId: parseInt(session?.user?.id as string),
        contestId: parseInt(formData.contestId),
        contingentId: parseInt(formData.contingentId)
      };
      
      const response = await fetch('/api/participants/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create team");
      }
      
      toast.success("Team created successfully");
      router.push('/participants/teams');
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mr-2"
        >
          <Link href="/participants/teams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-primary" />
            Create New Team
          </CardTitle>
          <CardDescription>
            Create a team to participate in Techlympics competitions. Teams allow you to group contestants for team-based competitions.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contest Selection */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center">
                  <Trophy className="h-4 w-4 mr-2 text-primary" />
                  Select Contest
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="contestId">Contest <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.contestId}
                    onValueChange={(value) => handleSelectChange('contestId', value)}
                  >
                    <SelectTrigger id="contestId">
                      <SelectValue placeholder="Select a contest" />
                    </SelectTrigger>
                    <SelectContent>
                      {contests.length === 0 ? (
                        <SelectItem value="no_contests" disabled>No contests available</SelectItem>
                      ) : (
                        contests.map((contest) => (
                          <SelectItem key={contest.id} value={contest.id.toString()} className="flex items-center">
                            <div className="flex w-full items-center justify-between">
                              <span>{contest.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    Choose the contest this team will participate in
                  </span>
                </div>
              </div>
              
              <Separator />
              
              {/* Team Information */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2 text-primary" />
                  Team Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter team name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your team and its goals"
                    rows={3}
                  />
                </div>
              </div>
              
              {/* Contingent Information - Read Only */}
              {contingents.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <div className="flex items-center">
                    <School className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Team will be created under contingent:</span>
                  </div>
                  <p className="font-medium mt-1">
                    {contingents[0].name}
                  </p>
                </div>
              )}
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={() => router.push('/participants/teams')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="gap-1"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Team...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Team
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
