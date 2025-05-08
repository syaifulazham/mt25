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
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Define type-safe enums for the form
const GENDERS = ["MALE", "FEMALE"] as const;
type Gender = typeof GENDERS[number];

const EDU_LEVELS = ["Sekolah Rendah", "Sekolah Menengah", "Belia"] as const;
type EduLevel = typeof EDU_LEVELS[number];

// Grades remain as predefined options
const GRADES = ["1", "2", "3", "4", "5", "6", "PPKI"] as const;
type Grade = typeof GRADES[number];

// Define the form schema
const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  ic: z.string().min(12, { message: "IC must be 12 digits" }).max(12),
  gender: z.enum(GENDERS),
  edu_level: z.enum(EDU_LEVELS),
  class_grade: z.string(),
  class_name: z.string().optional().or(z.literal('')),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  age: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  contestant?: any;
  contingentId: number;
  onComplete: () => void;
}

const ContestantForm: React.FC<Props> = ({ contestant, contingentId, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [className, setClassName] = useState(contestant?.class_name || "");
  const [gradeValue, setGradeValue] = useState(contestant?.class_grade || "");

  const isEditMode = !!contestant;

  // Initialize form with existing data or defaults
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: contestant?.name || '',
      ic: contestant?.ic || '',
      gender: contestant?.gender || 'MALE',
      edu_level: contestant?.edu_level || 'Sekolah Rendah',
      class_grade: contestant?.class_grade || '',
      class_name: contestant?.class_name || '',
      email: contestant?.email || '',
      phone: contestant?.phone || '',
      age: contestant?.age?.toString() || ''
    },
  });

  // IC auto-population logic similar to participants form
  const handleICChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    // Update the IC field
    form.setValue('ic', numericValue);
    
    // If we have 12 digits, auto-populate other fields
    if (numericValue.length === 12) {
      // Extract year, month, and day from IC
      const yearPrefix = parseInt(numericValue.substring(0, 2)) <= 25 ? '20' : '19';
      const yearOfBirth = parseInt(yearPrefix + numericValue.substring(0, 2));
      
      // Calculate age based on birth year (current year is 2025)
      const currentYear = 2025;
      const age = currentYear - yearOfBirth;
      
      // Determine gender based on last digit
      const lastDigit = parseInt(numericValue.charAt(11));
      const gender: Gender = lastDigit % 2 === 1 ? 'MALE' : 'FEMALE';
      
      // Determine education level based on age
      let eduLevel: EduLevel = 'Belia';
      if (age >= 7 && age <= 12) {
        eduLevel = 'Sekolah Rendah';
      } else if (age >= 13 && age <= 17) {
        eduLevel = 'Sekolah Menengah';
      }
      
      // Determine class grade based on age
      let classGrade = '';
      if (age >= 7 && age <= 12) {
        const gradeNum = age - 6;
        // Make sure we only assign valid grades from our GRADES array
        if (gradeNum >= 1 && gradeNum <= 6) {
          classGrade = gradeNum.toString();
        }
      } else if (age >= 13 && age <= 17) {
        const gradeNum = age - 12;
        // Make sure we only assign valid grades from our GRADES array
        if (gradeNum >= 1 && gradeNum <= 5) {
          classGrade = gradeNum.toString();
        }
      }
      
      // Update form with auto-calculated values
      form.setValue('age', age.toString());
      form.setValue('gender', gender);
      form.setValue('edu_level', eduLevel);
      form.setValue('class_grade', classGrade);
      setGradeValue(classGrade);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        ...data,
        class_grade: gradeValue,
        class_name: className,
        contingentId: contingentId
      };

      const url = isEditMode 
        ? `/api/organizer/contestants/${contestant.id}` 
        : '/api/organizer/contestants';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contestant');
      }

      toast.success(`Contestant ${isEditMode ? 'updated' : 'created'} successfully`);
      onComplete();
    } catch (error: any) {
      console.error('Error saving contestant:', error);
      toast.error(error.message || 'Failed to save contestant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-muted/30 p-4 rounded-lg mb-6 border">
          <h3 className="font-medium mb-2">Contingent Information</h3>
          <p className="text-sm text-muted-foreground">Adding contestant to contingent ID: {contingentId}</p>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-medium mb-4 text-lg">Personal Information</h3>
          
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name as in IC" {...field} />
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
                      placeholder="Enter IC without dashes" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleICChange(e);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Malaysian IC number (12 digits, no dashes) - will auto-populate other fields
                  </FormDescription>
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
                      placeholder="Age will be auto-calculated from IC" 
                      {...field} 
                      readOnly={true}
                      className="bg-muted/30"
                    />
                  </FormControl>
                  <FormDescription>
                    Age is automatically calculated from IC number
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormDescription>
                      Gender is auto-detected from the IC number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="edu_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Primary School">Primary School</SelectItem>
                        <SelectItem value="Secondary School">Secondary School</SelectItem>
                        <SelectItem value="Youth">Youth</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Based on age calculated from IC number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="class_grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class/Grade</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setGradeValue(value);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class/grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Based on age calculated from IC number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter class name" 
                        {...field} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          field.onChange(e.target.value);
                          setClassName(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the name of the class (e.g., Muhibbah, Cerdik, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onComplete}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Update' : 'Create'} Contestant
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default ContestantForm;
