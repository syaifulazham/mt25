"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ChevronLeft, Info, Loader2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

// Validation schema for team form
const teamSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters" }).max(50, { message: "Team name must not exceed 50 characters" }),
  description: z.string().max(500, { message: "Description must not exceed 500 characters" }).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
});

type TeamFormValues = z.infer<typeof teamSchema>;

interface Contest {
  id: number;
  name: string;
  description: string;
  teamBased: boolean;
  minTeamSize: number;
  maxTeamSize: number;
}

interface Contingent {
  id: number;
  name: string;
  institutionName: string;
  institutionType: string;
}

interface Team {
  id: number;
  name: string;
  hashcode: string;
  description?: string;
  status: string;
  contestId: number;
  contestName: string;
  contingentId: number;
  contingentName: string;
  institutionName?: string;
  institutionType?: string;
  isOwner: boolean;
  isManager: boolean;
}

export default function EditTeamPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  
  // Setup form with Zod validation
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "ACTIVE",
    },
  });
  
  // Fetch team data
  useEffect(() => {
    const fetchTeam = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/participants/teams/${params.id}`);
        
        if (!response.ok) {
          throw new Error(t('teams.error_fetch_details') || "Failed to fetch team details");
        }
        
        const data = await response.json();
        setTeam(data);
        
        // Populate form with team data
        form.reset({
          name: data.name,
          description: data.description || "",
          status: data.status,
        });
      } catch (error) {
        console.error("Error fetching team:", error);
        toast.error(t('teams.error_load_details') || "Failed to load team details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeam();
  }, [session, params.id, form]);
  
  // Handle form submission
  const onSubmit = async (data: TeamFormValues) => {
    if (!team) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/participants/teams/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('teams.error_update') || "Failed to update team");
      }
      
      toast.success(t('teams.update_success') || "Team updated successfully");
      router.push(`/participants/teams/${params.id}`);
    } catch (error: any) {
      console.error("Error updating team:", error);
      toast.error(error.message || t('teams.error_update') || "Failed to update team");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link href={`/participants/teams/${params.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('teams.back_to_team')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t('teams.edit_team')}</h1>
      </div>
      
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-1/4" />
          </CardFooter>
        </Card>
      ) : !team ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t('teams.not_found')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t('teams.edit_not_found_description')}
            </p>
            <Button asChild>
              <Link href="/participants/teams">
                {t('teams.return_to_teams')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : !team.isManager ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t('teams.permission_denied')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t('teams.edit_permission_description')}
            </p>
            <Button asChild>
              <Link href={`/participants/teams/${params.id}`}>
                {t('teams.return_to_details')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('teams.edit_team')}</CardTitle>
            <CardDescription>
              {t('teams.edit_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('teams.team_name')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('teams.enter_team_name')} {...field} />
                            </FormControl>
                            <FormDescription>
                              {t('teams.team_name_description')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('teams.status')}</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('teams.select_status')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ACTIVE">{t('teams.status_active')}</SelectItem>
                                <SelectItem value="INACTIVE">{t('teams.status_inactive')}</SelectItem>
                                <SelectItem value="PENDING">{t('teams.status_pending')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t('teams.status_description')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('teams.description')}</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={t('teams.enter_description')} 
                                className="min-h-[120px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              {t('teams.description_help')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('teams.contest')}</Label>
                    <div className="p-4 border rounded-md bg-muted/30">
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="font-medium">{team.contestName || t('teams.na')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('teams.contest_unchangeable')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('teams.contingent')}</Label>
                    <div className="p-4 border rounded-md bg-muted/30">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="font-medium">{team.contingentName || t('teams.na')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('teams.contingent_unchangeable')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => router.push(`/participants/teams/${params.id}`)}
                    disabled={isSubmitting}
                  >
                    {t('teams.cancel')}
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting || !form.formState.isDirty}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('teams.updating')}
                      </>
                    ) : (
                      t('teams.update_team')
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
