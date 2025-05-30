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
import { useLanguage } from "@/lib/i18n/language-context";

// Form validation schema - using error messages from translations
const createFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('manager.new.error_name')),
  ic: z.string()
    .min(12, t('manager.new.error_ic_length'))
    .max(12, t('manager.new.error_ic_length'))
    .regex(/^\d+$/, t('manager.new.error_ic_format')),
  email: z.string().email(t('manager.new.error_email')).optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  teamIds: z.array(z.string()).optional().default([]),
});

// Using ReturnType to get the schema type from our function
type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

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
  const { t } = useLanguage();

  // Initialize form with translated schema
  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(t)),
    defaultValues: {
      name: "",
      ic: "",
      email: "",
      phoneNumber: "",
      teamIds: [],
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
          throw new Error(t('manager.new.error_teams'));
        }
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        console.error("Error fetching teams:", error);
        toast.error(t('manager.new.error_teams'));
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
        teamIds: values.teamIds?.map(id => parseInt(id)) || [],
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
        throw new Error(errorData.message || t('manager.new.error'));
      }
      
      toast.success(t('manager.new.success'));
      
      // Redirect to managers list
      router.push("/participants/managers");
      router.refresh();
    } catch (error) {
      console.error("Error creating manager:", error);
      toast.error(error instanceof Error ? error.message : t('manager.new.error'));
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
            {t('manager.new.back')}
          </Link>
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('manager.new.title')}</CardTitle>
              <CardDescription>
                {t('manager.new.description')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Manager Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('manager.new.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('manager.new.name_placeholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('manager.new.name_description')}
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
                    <FormLabel>{t('manager.new.ic')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('manager.new.ic_placeholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('manager.new.ic_description')}
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
                    <FormLabel>{t('manager.new.email')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder={t('manager.new.email_placeholder')} 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('manager.new.email_description')}
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
                    <FormLabel>{t('manager.new.phone')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder={t('manager.new.phone_placeholder')} 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('manager.new.phone_description')}
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
                    <FormLabel>{t('manager.new.teams')}</FormLabel>
                    <div className="space-y-2">
                      {isLoadingTeams ? (
                        <div className="flex items-center space-x-2 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">{t('manager.new.loading_teams')}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {teams.map((team) => (
                            <div key={team.id} className="flex items-center space-x-2">
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
                              <label
                                htmlFor={`team-${team.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {team.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      {t('manager.new.teams_description') || "Select all teams this manager should have access to"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/participants/managers">{t('manager.new.cancel')}</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('manager.new.creating')}
                  </>
                ) : (
                  t('manager.new.create')
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
