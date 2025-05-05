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

export default function NewManagerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      teamId: undefined,
    },
  });

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
      // Generate a unique hashcode (typically this would be done server-side)
      // For client-side demo purposes, we're creating one based on name + timestamp
      const timestamp = Date.now().toString(36);
      const nameHash = values.name.replace(/\s+/g, '').toLowerCase().substring(0, 5);
      const hashcode = `${nameHash}-${timestamp}`;
      
      const payload = {
        ...values,
        hashcode,
        teamId: values.teamId ? parseInt(values.teamId) : null,
      };
      
      const response = await fetch("/api/participants/managers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create manager");
      }
      
      toast.success("Manager created successfully");
      
      // Redirect to managers list
      router.push("/participants/managers");
      router.refresh();
    } catch (error) {
      console.error("Error creating manager:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create manager");
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
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Manager</CardTitle>
              <CardDescription>
                Create a new independent manager for team management
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
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/participants/managers">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Manager"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
