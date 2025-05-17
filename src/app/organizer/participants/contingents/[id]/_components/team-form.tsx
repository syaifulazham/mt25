"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, Mail, Upload, FileText, ExternalLink, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters" }),
  description: z.string().optional(),
  team_email: z.string().email({ message: "Please enter a valid email address" }).optional(),
  contestId: z.number().min(1, { message: "Please select a contest" }),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
  maxMembers: z.number().min(1).max(10),
  // Evidence document is handled separately since it's a file
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      team_email: team?.team_email || '',
      contestId: team?.contestId || 0,
      status: team?.status || 'ACTIVE',
      maxMembers: team?.maxMembers || 4,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file type (PDF or images)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF or image file (JPEG, PNG).');
        return;
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadEvidenceDocument = async (teamId: number) => {
    if (!selectedFile) return null;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('teamId', teamId.toString());
      
      const response = await fetch('/api/upload/evidence-doc', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload evidence document');
      }
      
      const data = await response.json();
      return data.documentUrl;
    } catch (error) {
      console.error('Error uploading evidence document:', error);
      toast.error('Failed to upload evidence document');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const payload: any = {
        ...data,
        contingentId
      };
      
      // If in edit mode and a new file is selected, upload it
      let documentUrl = null;
      if (selectedFile) {
        if (isEditMode && team.id) {
          documentUrl = await uploadEvidenceDocument(team.id);
          if (documentUrl) {
            payload.evidence_doc = documentUrl;
            payload.evidence_submitteddate = new Date().toISOString();
          }
        }
      }

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
      
      // If creating a new team and we have a file, upload it after team creation
      if (!isEditMode && selectedFile) {
        const teamData = await response.json();
        if (teamData.id) {
          documentUrl = await uploadEvidenceDocument(teamData.id);
          if (documentUrl) {
            // Update the newly created team with the document URL
            await fetch(`/api/organizer/teams/${teamData.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                evidence_doc: documentUrl,
                evidence_submitteddate: new Date().toISOString()
              }),
            });
          }
        }
      }

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
        
        <FormField
          control={form.control}
          name="team_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Email</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="team@example.com" {...field} value={field.value || ''} />
                </div>
              </FormControl>
              <FormDescription>
                Team contact email for communication
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Evidence Document Upload */}
        <div className="space-y-2">
          <Label htmlFor="evidence-doc">Evidence Document</Label>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Show existing document if available */}
                  {isEditMode && team?.evidence_doc && !selectedFile ? (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="text-sm">Document uploaded on {team.evidence_submitteddate ? new Date(team.evidence_submitteddate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center space-x-1" 
                          onClick={() => window.open(team.evidence_doc, '_blank')}
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Document</span>
                        </Button>
                        <Button
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.click();
                          }}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Replace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selectedFile ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-5 w-5 text-green-500" />
                            <span className="text-sm">{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</span>
                          </div>
                          <Button
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            Change File
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md hover:border-primary cursor-pointer"
                          onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.click();
                          }}
                        >
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload evidence document</p>
                          <p className="text-xs text-muted-foreground mt-1">(PDF, JPEG, PNG, max 5MB)</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="evidence-doc"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

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
