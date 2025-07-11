'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Contest = {
  id: number;
  name: string;
};

type Section = {
  id: number;
  eventId: number;
  contestId: number;
  sectionName: string;
  sectionCode: string;
  sectionDescription?: string;
  sectionStatus: string;
  sectionType: string;
  sectionNote?: string;
  sectionPIC?: string;
  sectionPICPhone?: string;
  contestName: string;
};

type SectionFormData = {
  contestId: number;
  sectionName: string;
  sectionCode: string;
  sectionDescription?: string;
  sectionStatus: string;
  sectionType: string;
  sectionNote?: string;
  sectionPIC?: string;
  sectionPICPhone?: string;
};

const defaultFormData: SectionFormData = {
  contestId: 0,
  sectionName: '',
  sectionCode: '',
  sectionDescription: '',
  sectionStatus: 'Active',
  sectionType: 'Manual',
  sectionNote: '',
  sectionPIC: '',
  sectionPICPhone: '',
};

export default function SectionsPage() {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SectionFormData>({...defaultFormData});
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch sections and contests
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch sections
        const sectionsRes = await fetch(`/api/organizer/events/${eventId}/attendance/sections`);
        if (!sectionsRes.ok) throw new Error('Failed to fetch sections');
        const sectionsData = await sectionsRes.json();
        
        // Fetch contests for this event
        const contestsRes = await fetch(`/api/organizer/events/${eventId}/contests`);
        if (!contestsRes.ok) throw new Error('Failed to fetch contests');
        const contestsData = await contestsRes.json();
        
        setSections(sectionsData.sections);
        setContests(contestsData.contests);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load sections data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: name === 'contestId' ? parseInt(value, 10) : value }));
  };

  const resetForm = () => {
    setFormData({...defaultFormData});
    setEditingSectionId(null);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (section: Section) => {
    setEditingSectionId(section.id);
    setFormData({
      contestId: section.contestId,
      sectionName: section.sectionName,
      sectionCode: section.sectionCode,
      sectionDescription: section.sectionDescription || '',
      sectionStatus: section.sectionStatus,
      sectionType: section.sectionType,
      sectionNote: section.sectionNote || '',
      sectionPIC: section.sectionPIC || '',
      sectionPICPhone: section.sectionPICPhone || '',
    });
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (sectionId: number) => {
    setDeletingSectionId(sectionId);
    setConfirmDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const isEditing = editingSectionId !== null;
      const endpoint = isEditing 
        ? `/api/organizer/events/${eventId}/attendance/sections/${editingSectionId}` 
        : `/api/organizer/events/${eventId}/attendance/sections`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          eventId: Number(eventId),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save section');
      
      const result = await response.json();
      
      // Update sections list
      if (isEditing) {
        setSections(sections.map(section => 
          section.id === editingSectionId
            ? { ...result.section, contestName: contests.find(c => c.id === result.section.contestId)?.name || '' }
            : section
        ));
        toast({
          title: 'Section Updated',
          description: `Section "${result.section.sectionName}" has been updated.`,
        });
      } else {
        setSections([
          ...sections, 
          { 
            ...result.section, 
            contestName: contests.find(c => c.id === result.section.contestId)?.name || '' 
          }
        ]);
        toast({
          title: 'Section Created',
          description: `Section "${result.section.sectionName}" has been created.`,
        });
      }
      
      // Close dialog and reset form
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving section:', error);
      toast({
        title: 'Error',
        description: 'Failed to save section. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSectionId) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/sections/${deletingSectionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete section');
      
      // Update sections list
      setSections(sections.filter(section => section.id !== deletingSectionId));
      
      toast({
        title: 'Section Deleted',
        description: 'The section has been deleted successfully.',
      });
      
      // Close dialog
      setConfirmDeleteDialogOpen(false);
      setDeletingSectionId(null);
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete section. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link href={`/organizer/events/${eventId}/attendance`}>
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Event Sections</h1>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Competition Sections</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-12">
              <p className="text-gray-500">Loading sections...</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-gray-500">No sections have been created yet. Click "Add Section" to create one.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section Code</TableHead>
                    <TableHead>Section Name</TableHead>
                    <TableHead>Competition</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.sectionCode}</TableCell>
                      <TableCell>{section.sectionName}</TableCell>
                      <TableCell>{section.contestName}</TableCell>
                      <TableCell>{section.sectionPIC || '-'}</TableCell>
                      <TableCell>{section.sectionPICPhone || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          section.sectionStatus === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {section.sectionStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenEditDialog(section)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleOpenDeleteDialog(section.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Section Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSectionId ? 'Edit Section' : 'Create New Section'}
            </DialogTitle>
            <DialogDescription>
              {editingSectionId 
                ? 'Update the details for this section' 
                : 'Add a new section to organize competition areas'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="contestId" className="block text-sm font-medium mb-1">
                Competition
              </label>
              <Select
                value={formData.contestId.toString()}
                onValueChange={(value) => handleSelectChange('contestId', value)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select competition" />
                </SelectTrigger>
                <SelectContent>
                  {contests.map((contest) => (
                    <SelectItem key={contest.id} value={contest.id.toString()}>
                      {contest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sectionName" className="block text-sm font-medium mb-1">
                  Section Name
                </label>
                <Input
                  id="sectionName"
                  name="sectionName"
                  value={formData.sectionName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="sectionCode" className="block text-sm font-medium mb-1">
                  Section Code
                </label>
                <Input
                  id="sectionCode"
                  name="sectionCode"
                  value={formData.sectionCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="sectionDescription" className="block text-sm font-medium mb-1">
                Description
              </label>
              <Input
                id="sectionDescription"
                name="sectionDescription"
                value={formData.sectionDescription}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sectionStatus" className="block text-sm font-medium mb-1">
                  Status
                </label>
                <Select
                  value={formData.sectionStatus}
                  onValueChange={(value) => handleSelectChange('sectionStatus', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label htmlFor="sectionType" className="block text-sm font-medium mb-1">
                  Type
                </label>
                <Select
                  value={formData.sectionType}
                  onValueChange={(value) => handleSelectChange('sectionType', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Automated">Automated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label htmlFor="sectionNote" className="block text-sm font-medium mb-1">
                Note
              </label>
              <Input
                id="sectionNote"
                name="sectionNote"
                value={formData.sectionNote}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sectionPIC" className="block text-sm font-medium mb-1">
                  Person in Charge
                </label>
                <Input
                  id="sectionPIC"
                  name="sectionPIC"
                  value={formData.sectionPIC}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="sectionPICPhone" className="block text-sm font-medium mb-1">
                  Contact Number
                </label>
                <Input
                  id="sectionPICPhone"
                  name="sectionPICPhone"
                  value={formData.sectionPICPhone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>Saving...</>
                ) : editingSectionId ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this section? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
