'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { contestApi } from '@/lib/api-client';
import { targetGroupApi } from '@/lib/api-client';
import { format } from 'date-fns';

// Define contest form schema with Zod
const contestFormSchema = z.object({
  name: z.string().min(3, {
    message: "Contest name must be at least 3 characters.",
  }),
  code: z.string().min(2, {
    message: "Contest code must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  contestType: z.string({
    required_error: "Please select a contest type.",
  }),
  method: z.string({
    required_error: "Please select a contest method.",
  }),
  judgingMethod: z.string({
    required_error: "Please select a judging method.",
  }),
  startDate: z.string({
    required_error: "Please select a start date.",
  }),
  endDate: z.string({
    required_error: "Please select an end date.",
  }),
  accessibility: z.boolean().default(false),
  targetGroupIds: z.array(z.number()).min(1, {
    message: "Please select at least one target group.",
  }),
});

// Define the form values type
type ContestFormValues = z.infer<typeof contestFormSchema>;

// Default values for the form
const defaultValues: Partial<ContestFormValues> = {
  name: "",
  code: "",
  description: "",
  contestType: "",
  method: "",
  judgingMethod: "",
  accessibility: false,
  targetGroupIds: [],
};

interface ContestFormProps {
  initialData?: any;
}

export function ContestForm({ initialData }: ContestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetGroups, setTargetGroups] = useState<any[]>([]);
  const [selectedTargetGroups, setSelectedTargetGroups] = useState<number[]>([]);
  const isEditMode = !!initialData;

  // Fetch target groups
  useEffect(() => {
    const fetchTargetGroups = async () => {
      try {
        const response = await targetGroupApi.getTargetGroups();
        // Check if the response is an array (old format) or has a data property (new format)
        const data = Array.isArray(response) ? response : response.data;
        setTargetGroups(data || []);
      } catch (error) {
        console.error('Error fetching target groups:', error);
        toast.error('Failed to load target groups');
      }
    };

    fetchTargetGroups();
  }, []);

  // Set initial target groups if in edit mode
  useEffect(() => {
    if (initialData && initialData.targetGroup) {
      const targetGroupIds = initialData.targetGroup.map((tg: any) => tg.id);
      setSelectedTargetGroups(targetGroupIds);
    }
  }, [initialData]);

  // Prepare initial values for the form
  const getInitialValues = () => {
    if (!initialData) return defaultValues;

    return {
      name: initialData.name,
      code: initialData.code,
      description: initialData.description || "",
      contestType: initialData.contestType,
      method: initialData.method,
      judgingMethod: initialData.judgingMethod,
      startDate: format(new Date(initialData.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(initialData.endDate), 'yyyy-MM-dd'),
      accessibility: initialData.accessibility || false,
      targetGroupIds: initialData.targetGroup ? initialData.targetGroup.map((tg: any) => tg.id) : [],
    };
  };

  // Initialize the form
  const form = useForm<ContestFormValues>({
    resolver: zodResolver(contestFormSchema),
    defaultValues: getInitialValues(),
  });

  // Handle target group selection
  const handleTargetGroupChange = (targetGroupId: number, checked: boolean) => {
    console.log(`handleTargetGroupChange called: targetGroupId=${targetGroupId}, checked=${checked}`);
    
    // Update the selected target groups state
    setSelectedTargetGroups(prev => {
      const newSelection = checked 
        ? [...prev, targetGroupId] 
        : prev.filter(id => id !== targetGroupId);
      
      console.log('New selection:', newSelection);
      return newSelection;
    });
    
    // Update form values
    const currentIds = form.getValues('targetGroupIds') || [];
    if (checked) {
      form.setValue('targetGroupIds', [...currentIds, targetGroupId], { shouldDirty: true });
    } else {
      form.setValue('targetGroupIds', currentIds.filter(id => id !== targetGroupId), { shouldDirty: true });
    }
  };

  // Handle form submission
  async function onSubmit(data: ContestFormValues) {
    setIsSubmitting(true);
    
    try {
      if (isEditMode) {
        // Update existing contest
        await contestApi.updateContest(initialData.id, {
          ...data,
          targetGroupIds: selectedTargetGroups,
        });
        toast.success("Contest has been updated successfully.");
      } else {
        // Create new contest
        await contestApi.createContest({
          ...data,
          targetGroupIds: selectedTargetGroups,
        });
        toast.success("Contest has been created successfully.");
      }
      
      // Redirect to contests page
      router.push('/organizer/contests');
      router.refresh();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.message || "There was a problem saving the contest.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Contest Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contest Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Coding Challenge 2025" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of your contest as it will appear to participants.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contest Code */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contest Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CODING-2025" {...field} disabled={isEditMode} />
                    </FormControl>
                    <FormDescription>
                      A unique code for the contest. Cannot be changed after creation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the contest, its objectives, and what participants can expect..." 
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A detailed description of the contest.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Contest Type */}
              <FormField
                control={form.control}
                name="contestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contest Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a contest type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="QUIZ">Quiz</SelectItem>
                        <SelectItem value="CODING">Coding</SelectItem>
                        <SelectItem value="STRUCTURE_BUILDING">Structure Building</SelectItem>
                        <SelectItem value="FASTEST_COMPLETION">Fastest Completion</SelectItem>
                        <SelectItem value="POSTER_PRESENTATION">Poster Presentation</SelectItem>
                        <SelectItem value="SCIENCE_PROJECT">Science Project</SelectItem>
                        <SelectItem value="ENGINEERING_DESIGN">Engineering Design</SelectItem>
                        <SelectItem value="ANALYSIS_CHALLENGE">Analysis Challenge</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of contest.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contest Method */}
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contest Method</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a contest method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="TEAM">Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Whether participants compete individually or in teams.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Judging Method */}
              <FormField
                control={form.control}
                name="judgingMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judging Method</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a judging method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AUTOMATIC">Automatic</SelectItem>
                        <SelectItem value="MANUAL">Manual</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How submissions will be judged.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Accessibility */}
              <FormField
                control={form.control}
                name="accessibility"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Public Contest
                      </FormLabel>
                      <FormDescription>
                        If checked, the contest will be visible to all participants.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Contest Dates */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the contest will begin.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the contest will end.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Target Groups */}
            <FormField
              control={form.control}
              name="targetGroupIds"
              render={() => (
                <FormItem>
                  <FormLabel>Target Groups</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {targetGroups.map((targetGroup) => (
                      <div key={targetGroup.id} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Switch 
                            id={`target-group-${targetGroup.id}`} 
                            checked={selectedTargetGroups.includes(targetGroup.id)}
                            onCheckedChange={(checked) => {
                              console.log(`Switch toggled: ${targetGroup.id} to ${checked}`);
                              handleTargetGroupChange(targetGroup.id, checked);
                            }}
                          />
                        </div>
                        <Label 
                          htmlFor={`target-group-${targetGroup.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                          onClick={() => {
                            const isCurrentlyChecked = selectedTargetGroups.includes(targetGroup.id);
                            handleTargetGroupChange(targetGroup.id, !isCurrentlyChecked);
                          }}
                        >
                          {targetGroup.name} ({targetGroup.ageGroup}, {targetGroup.schoolLevel})
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormDescription>
                    Select the target groups that can participate in this contest.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update Contest' : 'Create Contest'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
