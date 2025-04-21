'use client';

import { useState, useEffect } from 'react';
import { Contestant } from '@/types/contestant';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Using the shared Contestant interface from @/types/contestant

interface EditContestantModalProps {
  contestant: Contestant;
  onUpdate: (updatedContestant: Contestant) => void;
}

export default function EditContestantModal({ contestant, onUpdate }: EditContestantModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Contestant>({...contestant});
  
  // Reset form data when contestant changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({...contestant});
    }
  }, [contestant, isOpen]);
  
  const handleChange = (field: keyof Contestant, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!formData.name?.trim()) {
      errors.push('Name is required');
    }
    
    const cleanedIC = formData.ic?.replace(/\D/g, '');
    if (!cleanedIC || cleanedIC.length !== 12) {
      errors.push('IC must be exactly 12 digits');
    }
    
    if (!['MALE', 'FEMALE'].includes(formData.gender)) {
      errors.push('Gender must be MALE or FEMALE');
    }
    
    const age = parseInt(formData.age.toString());
    if (isNaN(age) || age <= 0) {
      errors.push('Age must be a positive number');
    }
    
    const validEduLevels = ['sekolah rendah', 'sekolah menengah', 'belia'];
    if (!formData.edu_level || !validEduLevels.includes(formData.edu_level.toLowerCase())) {
      errors.push('Education level must be one of: sekolah rendah, sekolah menengah, belia');
    }
    
    if (formData.class_grade) {
      const validGrades = ['1', '2', '3', '4', '5', '6', 'PPKI'];
      if (!validGrades.includes(formData.class_grade)) {
        errors.push('Grade must be 1, 2, 3, 4, 5, 6, or PPKI');
      }
    }
    
    return errors;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Use PATCH instead of PUT to match the API endpoint
      const response = await fetch(`/api/participants/contestants/${contestant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contestant');
      }
      
      const updatedContestant = await response.json();
      onUpdate(updatedContestant);
      toast.success('Contestant updated successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating contestant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update contestant');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit contestant</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Contestant</DialogTitle>
          <DialogDescription>
            Update contestant information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ic" className="text-right">
                IC Number
              </Label>
              <Input
                id="ic"
                value={formData.ic}
                onChange={(e) => handleChange('ic', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                Phone
              </Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gender" className="text-right">
                Gender
              </Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value) => handleChange('gender', value)}
              >
                <SelectTrigger id="gender" className="col-span-3">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">MALE</SelectItem>
                  <SelectItem value="FEMALE">FEMALE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="age" className="text-right">
                Age
              </Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', parseInt(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edu_level" className="text-right">
                Education
              </Label>
              <Select 
                value={formData.edu_level} 
                onValueChange={(value) => handleChange('edu_level', value)}
              >
                <SelectTrigger id="edu_level" className="col-span-3">
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sekolah rendah">Sekolah Rendah</SelectItem>
                  <SelectItem value="sekolah menengah">Sekolah Menengah</SelectItem>
                  <SelectItem value="belia">Belia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class_name" className="text-right">
                Class Name
              </Label>
              <Input
                id="class_name"
                value={formData.class_name || ''}
                onChange={(e) => handleChange('class_name', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class_grade" className="text-right">
                Class Grade
              </Label>
              <Select 
                value={formData.class_grade || ''} 
                onValueChange={(value) => handleChange('class_grade', value)}
              >
                <SelectTrigger id="class_grade" className="col-span-3">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="PPKI">PPKI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
