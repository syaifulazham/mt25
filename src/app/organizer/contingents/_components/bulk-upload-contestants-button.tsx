'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

interface BulkUploadContestantsButtonProps {
  contingentId: number;
  refreshContestants?: () => void;
}

export default function BulkUploadContestantsButton({ contingentId, refreshContestants }: BulkUploadContestantsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isPpki, setIsPpki] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Function to download CSV template
  const downloadCsvTemplate = () => {
    // Define the headers for contestant upload
    const headers = ['name', 'ic', 'gender', 'edu_level', 'phone', 'email'];
    
    // Create example data row (commented out in the CSV)
    const exampleData = [
      '# Example: John Doe', 
      '123456789012', 
      'MALE', // MALE or FEMALE only
      'PRIMARY', // PRIMARY, SECONDARY, or HIGHER only
      '0123456789', 
      'email@example.com'
    ];
    
    // Create notes about required fields
    const notes = [
      '# Required fields: name, ic, gender, edu_level',
      '# Gender must be MALE or FEMALE',
      '# Education level must be PRIMARY, SECONDARY, or HIGHER'
    ];
    
    // Combine all rows
    const csvContent = [
      headers.join(','),
      ...notes,
      exampleData.join(',')
    ].join('\n');
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set up and trigger download
    link.setAttribute('href', url);
    link.setAttribute('download', `contestant_template.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('CSV template downloaded');
  };
  
  // File drop handling
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });
  
  // CSV validation and parsing function
  const handleValidateFile = async () => {
    if (!file) {
      toast.error('Please select a CSV file to upload');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10); // Start progress
    
    try {
      // Read the file
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      
      setUploadProgress(30);
      
      // Parse CSV with Papa Parse
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true
      });
      
      if (!Array.isArray(parseResult.data) || parseResult.data.length === 0) {
        throw new Error('No valid data found in CSV file');
      }
      
      setUploadProgress(60);
      
      // Basic validation of required fields
      const records = parseResult.data as Record<string, any>[];
      let invalidCount = 0;
      
      records.forEach(record => {
        if (!record.name || !record.ic || !record.gender || !record.edu_level) {
          invalidCount++;
        }
      });
      
      setUploadProgress(100);
      
      // Display validation results
      if (invalidCount > 0) {
        toast.warning(`CSV contains ${invalidCount} invalid records. Please ensure all required fields are present.`);
      } else {
        toast.success(`CSV validated successfully with ${records.length} records. Ready to upload.`);
      }
      
      // Store parsed data for upload
      localStorage.setItem(`csv_data_${contingentId}`, JSON.stringify(records));
      
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error(`Validation failed: ${error.message || 'Unknown error'}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    // Retrieve parsed data from localStorage
    const storedData = localStorage.getItem(`csv_data_${contingentId}`);
    if (!storedData) {
      toast.error('No validated data found. Please validate the CSV file first.');
      return;
    }
    
    const csvData = JSON.parse(storedData);
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Show initial progress
      setUploadProgress(10);
      
      // Prepare formData with JSON data and isPpki flag
      const formData = new FormData();
      formData.append('data', JSON.stringify(csvData));
      formData.append('is_ppki', isPpki ? '1' : '0');
      
      // Update progress before actual API call
      setUploadProgress(30);
      
      // Make API call to upload contestants
      const response = await fetch(`/api/organizer/contingents/${contingentId}/bulk-contestants`, {
        method: 'POST',
        body: formData,
      });
      
      // Show progress during processing
      setUploadProgress(70);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error during upload');
      }
      
      // Process response
      const result = await response.json();
      setUploadProgress(100);
      
      // Clean up stored data
      localStorage.removeItem(`csv_data_${contingentId}`);
      
      // Show success message with counts
      toast.success(`Successfully uploaded ${result.success || 0} contestants`);
      
      // Close dialog and refresh parent component
      setIsOpen(false);
      if (refreshContestants) {
        refreshContestants();
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message || 'Please try again'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const closeDialog = () => {
    setIsOpen(false);
    setFile(null);
    setUploadProgress(0);
  };
  
  // Return JSX
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) closeDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload Contestants
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Contestants</DialogTitle>
          <DialogDescription>
            Upload a CSV file with contestant details for this contingent.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* File drop zone */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-2">Drag & drop a CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supports .csv files only</p>
          </div>
          
          {/* CSV Template Download Button */}
          <div className="flex justify-end">
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs" 
              onClick={(e) => {
                e.preventDefault();
                downloadCsvTemplate();
              }}
            >
              <FileText className="h-3 w-3 mr-1" />
              Download CSV Template
            </Button>
          </div>
          
          {/* Selected file info */}
          {file && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Selected file:</AlertTitle>
              <AlertDescription>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </AlertDescription>
            </Alert>
          )}
          
          {/* PPKI toggle */}
          <div className="flex items-center space-x-2">
            <Switch id="is-ppki" checked={isPpki} onCheckedChange={setIsPpki} />
            <Label htmlFor="is-ppki">Register as PPKI contestants</Label>
          </div>
          
          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center">{uploadProgress}% complete</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>Cancel</Button>
          <Button 
            onClick={file ? (uploadProgress === 100 ? handleUpload : handleValidateFile) : undefined}
            disabled={!file || isUploading}
          >
            {uploadProgress === 100 ? 'Upload' : 'Validate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
