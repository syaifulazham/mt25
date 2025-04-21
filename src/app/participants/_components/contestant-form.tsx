"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  ic: z.string().min(6, { message: 'IC number must be at least 6 characters.' }),
  gender: z.enum(['MALE', 'FEMALE']),
  age: z.coerce.number().int().min(5, { message: 'Age must be at least 5.' }).max(100, { message: 'Age must be less than 100.' }),
  edu_level: z.enum(['SEKOLAH RENDAH', 'SEKOLAH MENENGAH', 'BELIA']),
  class_name: z.string().optional(),
  contingentId: z.coerce.number().optional().nullable(),
});

type ContestantFormValues = z.infer<typeof formSchema>;

interface ContestantFormProps {
  contestant?: any;
  contingents?: any[];
  onSuccess?: () => void;
}

export default function ContestantForm({ contestant, contingents = [], onSuccess }: ContestantFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!contestant;

  // Default form values
  const defaultValues: Partial<ContestantFormValues> = {
    name: contestant?.name || '',
    ic: contestant?.ic || '',
    gender: contestant?.gender || 'MALE',
    age: contestant?.age || '',
    edu_level: contestant?.edu_level || 'SEKOLAH RENDAH',
    class_name: contestant?.class_name || '',
    contingentId: contestant?.contingentId || null,
  };

  const form = useForm<ContestantFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(values: ContestantFormValues) {
    setIsLoading(true);
    try {
      const url = isEditMode
        ? `/api/contestants/${contestant.id}`
        : '/api/contestants';
      
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Something went wrong');
      }

      const data = await response.json();
      
      toast.success(
        isEditMode
          ? 'Contestant updated successfully'
          : 'Contestant added successfully'
      );
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
        router.push('/participants/profile');
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Contestant' : 'Add New Contestant'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="ic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IC Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter IC number" 
                      {...field} 
                      disabled={isEditMode} // IC cannot be changed in edit mode
                    />
                  </FormControl>
                  <FormDescription>
                    IC number cannot be changed once set.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter age" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="edu_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SEKOLAH RENDAH">Sekolah Rendah</SelectItem>
                        <SelectItem value="SEKOLAH MENENGAH">Sekolah Menengah</SelectItem>
                        <SelectItem value="BELIA">Belia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter class name" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {contingents.length > 0 && (
              <FormField
                control={form.control}
                name="contingentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Team (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                      defaultValue={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {contingents.map((contingent) => (
                          <SelectItem key={contingent.id} value={contingent.id.toString()}>
                            {contingent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      You can assign this contestant to a team later if needed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <CardFooter className="flex justify-between px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditMode ? 'Update Contestant' : 'Add Contestant'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
