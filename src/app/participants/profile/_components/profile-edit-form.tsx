"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

// Define the form schema with validation using translation function
const createProfileFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, {
    message: t('profile.edit.validation.name_length'),
  }),
  phoneNumber: z.string().min(10, {
    message: t('profile.edit.validation.phone_length'),
  }).optional().or(z.literal("")),
  ic: z.string().min(12, {
    message: t('profile.edit.validation.ic_length'),
  }).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
});

// Use ReturnType to get the schema type from our function
type ProfileFormValues = z.infer<ReturnType<typeof createProfileFormSchema>>;

// Props for the ProfileEditForm component
interface ProfileEditFormProps {
  user: {
    id: number;
    name: string | null;
    email: string;
    phoneNumber?: string | null;
    ic?: string | null;
    gender?: string | null;
  };
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values from user and translated schema
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileFormSchema(t)),
    defaultValues: {
      name: user.name || "",
      phoneNumber: user.phoneNumber || "",
      ic: user.ic || "",
      gender: (user.gender as "MALE" | "FEMALE" | undefined) || undefined,
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/participants/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('profile.edit.error.update_failed'));
      }
      
      toast.success(t('profile.edit.success.updated'));
      router.push("/participants/profile");
      router.refresh(); // Refresh server components
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error instanceof Error ? error.message : t('profile.edit.error.update_failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link 
            href="/participants/profile" 
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <CardTitle>{t('profile.edit.form.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('profile.edit.form.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.edit.field.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('profile.edit.placeholder.name')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('profile.edit.help.name')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.edit.field.phone')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('profile.edit.placeholder.phone')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('profile.edit.help.phone')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="ic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.edit.field.ic')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('profile.edit.placeholder.ic')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('profile.edit.help.ic')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.edit.field.gender')}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('profile.edit.placeholder.gender')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">{t('profile.edit.gender.male')}</SelectItem>
                      <SelectItem value="FEMALE">{t('profile.edit.gender.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push("/participants/profile")}
                disabled={isSubmitting}
              >
                {t('profile.edit.button.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t('profile.edit.button.saving') : t('profile.edit.button.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
