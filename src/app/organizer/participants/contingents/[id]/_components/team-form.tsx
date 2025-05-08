"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters" }),
  description: z.string().optional(),
  contestId: z.number().min(1, { message: "Please select a contest" }),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
  maxMembers: z.number().min(1).max(10),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  team?: any;
  contingentId: number;
  onComplete: () => void;
}

const TeamForm: React.FC<Props> = ({ team, contingentId, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contests, setContests] = useState<any[]>([]);
  const [isLoadingContests, setIsLoadingContests] = useState(false);

  const isEditMode = !!team;

  // Fetch available contests
  useEffect(() => {
    const fetchContests = async () => {
      try {
        setIsLoadingContests(true);
        const response = await fetch('/api/organizer/contests');
        if (!response.ok) {
          throw new Error('Failed to fetch contests');
        }
        const data = await response.json();
        setContests(data);
      } catch (error) {
        console.error('Error fetching contests:', error);
        toast.error('Failed to fetch available contests');
      } finally {
        setIsLoadingContests(false);
      }
    };

    fetchContests();
  }, []);

  // Initialize form with existing data or defaults
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name || '',
      description: team?.description || '',
      contestId: team?.contestId || 0,
      status: team?.status || 'ACTIVE',
      maxMembers: team?.maxMembers || 4,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        ...data,
        contingentId
      };

      const url = isEditMode 
        ? `/api/organizer/teams/${team.id}` 
        : '/api/organizer/teams';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${isEditMode ? 'updating' : 'creating'} team`);
      }

      onComplete();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} team:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter team name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter team description" 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contestId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contest</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                defaultValue={field.value ? field.value.toString() : undefined}
                disabled={isLoadingContests}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingContests ? "Loading contests..." : "Select a contest"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contests.map((contest) => (
                    <SelectItem key={contest.id} value={contest.id.toString()}>
                      {contest.name || contest.title || `Contest #${contest.id}`}
                    </SelectItem>
                  ))}
                  {contests.length === 0 && !isLoadingContests && (
                    <SelectItem value="0" disabled>No contests available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the contest this team will participate in
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxMembers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Members</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select max members" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Maximum number of contestants allowed in this team
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Update' : 'Create'} Team
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default TeamForm;
