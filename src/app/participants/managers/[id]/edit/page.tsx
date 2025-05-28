"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ic: z.string()
    .min(12, "IC number must be 12 digits")
    .max(12, "IC number must be 12 digits")
    .regex(/^\d+$/, "IC number must contain only digits"),
  email: z.string().email("Invalid email format").optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  teamIds: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface Team {
  id: number;
  name: string;
  contestId?: number;
  contestName?: string;
  contestCode?: string;
}

interface ManagerData {
  id: number;
  name: string;
  ic: string;
  email: string | null;
  phoneNumber: string | null;
  hashcode: string;
  teamId: number | null; // For backward compatibility
  teams?: Array<{
    id: number;
    name: string;
  }>;
}

export default function EditManagerPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [manager, setManager] = useState<ManagerData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      ic: "",
      email: "",
      phoneNumber: "",
      teamIds: [],
    },
  });

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
        
        // Fetch the manager's team assignments
        const teamsResponse = await fetch(`/api/participants/managers/${params.id}/teams`);
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          data.teams = teamsData;
        }
        
        // Set form values
        form.setValue("name", data.name);
        form.setValue("ic", data.ic);
        form.setValue("email", data.email || '');
        form.setValue("phoneNumber", data.phoneNumber || '');
        
        // Set team IDs - combine legacy teamId with any teams from the junction table
        const selectedTeamIds: string[] = [];
        
        // Add the legacy teamId if it exists
        if (data.teamId) {
          selectedTeamIds.push(data.teamId.toString());
        }
        
        // Add team IDs from the teams array if it exists
        if (data.teams && data.teams.length > 0) {
          data.teams.forEach((team: { id: number; name: string }) => {
            if (!selectedTeamIds.includes(team.id.toString())) {
              selectedTeamIds.push(team.id.toString());
            }
          });
        }
        
        form.setValue("teamIds", selectedTeamIds);
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
  }, [status, params.id, form]);

  // Fetch teams for dropdown
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        if (!session?.user?.id) {
          throw new Error("User ID not available");
        }
        
        // The teams API requires a participantId parameter
        const response = await fetch(`/api/participants/teams?participantId=${session.user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch teams");
        }
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        console.error("Error fetching teams:", error);
        toast.error("Failed to load teams");
      } finally {
        setIsLoadingTeams(false);
      }
    };

    if (status === "authenticated" && session) {
      fetchTeams();
    }
  }, [status, session]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...values,
        // Convert team IDs to integers
        teamIds: values.teamIds?.map(id => parseInt(id)) || [],
      };
      
      const response = await fetch(`/api/participants/managers/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update manager");
      }
      
      toast.success("Manager updated successfully");
      
      // Redirect to manager details page
      router.push(`/participants/managers/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating manager:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update manager");
    } finally {
      setIsSubmitting(false);
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
          <div className="mt-6">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      ) : manager ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Manager</CardTitle>
                <CardDescription>
                  Update manager information
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Manager Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter manager's full name" {...field} />
                      </FormControl>
                      <FormDescription>
                        Full name as per identification document
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* IC Number */}
                <FormField
                  control={form.control}
                  name="ic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IC Number</FormLabel>
                      <FormControl>
                        <Input placeholder="12-digit IC number without dashes" {...field} />
                      </FormControl>
                      <FormDescription>
                        Malaysian IC number (12 digits without dashes)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Email Address */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="manager@example.com" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Contact email for the manager (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="e.g. 0123456789" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Contact phone number for the manager (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Team Selection - Multiple */}
                <FormField
                  control={form.control}
                  name="teamIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Teams</FormLabel>
                      <div className="space-y-2">
                        {isLoadingTeams ? (
                          <div className="flex items-center space-x-2 py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Loading teams...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {teams.map((team) => (
                              <div key={team.id} className="flex items-start space-x-2 mb-2 p-2 hover:bg-slate-50 rounded-md transition-colors">
                                <div className="pt-0.5">
                                  <input
                                    type="checkbox"
                                    id={`team-${team.id}`}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    value={team.id.toString()}
                                    checked={field.value?.includes(team.id.toString())}
                                    onChange={(e) => {
                                      const teamId = team.id.toString();
                                      const newValue = [...(field.value || [])];
                                      
                                      if (e.target.checked) {
                                        if (!newValue.includes(teamId)) {
                                          newValue.push(teamId);
                                        }
                                      } else {
                                        const index = newValue.indexOf(teamId);
                                        if (index !== -1) {
                                          newValue.splice(index, 1);
                                        }
                                      }
                                      
                                      field.onChange(newValue);
                                    }}
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label
                                    htmlFor={`team-${team.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {team.name}
                                  </label>
                                  
                                  {(team.contestName || team.contestCode) && (
                                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                      <span className="font-medium">{team.contestName}</span>
                                      {team.contestCode && (
                                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                          {team.contestCode}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormDescription>
                        Select all teams this manager should have access to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Manager Hashcode (display only) */}
                <div className="space-y-2">
                  <Label htmlFor="hashcode">Manager Code</Label>
                  <Input 
                    id="hashcode" 
                    value={manager.hashcode}
                    readOnly
                    disabled
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    The unique identifier code for this manager (cannot be changed)
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href={`/participants/managers/${params.id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-medium">Manager Not Found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            The manager you're trying to edit doesn't exist or you don't have permission to edit it.
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
