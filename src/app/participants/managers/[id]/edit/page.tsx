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
  teamId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Team {
  id: number;
  name: string;
}

interface ManagerData {
  id: number;
  name: string;
  ic: string;
  email: string | null;
  phoneNumber: string | null;
  hashcode: string;
  teamId: number | null;
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
      teamId: undefined,
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
        
        // Set form values
        form.setValue("name", data.name);
        form.setValue("ic", data.ic);
        form.setValue("email", data.email || '');
        form.setValue("phoneNumber", data.phoneNumber || '');
        form.setValue("teamId", data.teamId ? data.teamId.toString() : 'none');
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
        // Handle 'none' value explicitly and convert other values to integers
        teamId: values.teamId && values.teamId !== 'none' ? parseInt(values.teamId) : null,
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
          <Link href={`/participants/managers/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Manager Details
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
                
                {/* Team Selection */}
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Team (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isLoadingTeams}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None (No team assignment)</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optionally assign this manager to an existing team
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
