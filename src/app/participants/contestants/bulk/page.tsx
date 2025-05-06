'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  X, 
  Check,
  Pencil,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// Using a simpler navigation approach instead of Breadcrumb
import Link from 'next/link';

interface ValidatedRecord {
  rowNumber: number;
  isValid: boolean;
  validatedData: any;
  errors: Record<string, string>;
  derivedValues?: Record<string, any>;
}

interface ValidationResult {
  records: ValidatedRecord[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<'upload' | 'verify' | 'confirm'>('upload');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  // No need to track contingentId as it's now handled by the API
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  
  // No need to fetch the contingent ID as it's now handled by the API

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      // Reset states when a new file is uploaded
      setUploadResult(null);
      setValidationResult(null);
      setActiveStep('upload');
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  const validateFile = async () => {
    if (!file) {
      toast.error('Please select a file to validate');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);

      // Send the file to the validation API
      const response = await fetch('/api/participants/contestants/validate', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Validation failed');
        setIsUploading(false);
        return;
      }

      const data = await response.json();
      
      // Process each record with our client-side validation logic to apply auto-filling
      if (data && data.records && Array.isArray(data.records)) {
        // For each record, apply our IC-based auto-filling logic
        const processedRecords = data.records.map((record: ValidatedRecord) => {
          const validation = validateRecord(record.validatedData);
          return {
            ...record,
            validatedData: validation.updatedData,
            isValid: validation.isValid,
            errors: validation.errors
          };
        });
        
        // Update validation result with processed records
        const validCount = processedRecords.filter((r: ValidatedRecord) => r.isValid).length;
        data.records = processedRecords;
        data.validRecords = validCount;
        data.invalidRecords = processedRecords.length - validCount;
        
        // Show notification about auto-filling
        toast.info('IC numbers have been used to auto-fill missing information where possible');
      }
      
      setValidationResult(data);
      setActiveStep('verify');
    } catch (error) {
      console.error('Error validating file:', error);
      toast.error('Error validating file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeInvalidRows = () => {
    if (!validationResult) return;
    
    // Filter out invalid records
    const validRecords = validationResult.records.filter(record => record.isValid);
    
    // Update the validation result
    setValidationResult({
      records: validRecords,
      totalRecords: validRecords.length,
      validRecords: validRecords.length,
      invalidRecords: 0
    });
    
    toast.success("Invalid rows removed");
  };
  
  const resetUpload = () => {
    setFile(null);
    setValidationResult(null);
    setUploadResult(null);
    setUploadProgress(0);
    setActiveStep('upload');
  };

  const handleUpload = async () => {
    if (!validationResult || validationResult.validRecords === 0) {
      toast.error('No valid records to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Create a FormData object to send the validated data
    const formData = new FormData();
    
    // Only include valid records
    const validRecords = validationResult.records
      .filter(record => record.isValid)
      .map(record => record.validatedData);
    
    formData.append('data', JSON.stringify(validRecords));
    
    // No need to add contingent ID as it's now handled by the API

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 200);

      // Send the data to the upload API
      const response = await fetch('/api/participants/contestants/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Upload failed');
        setIsUploading(false);
        return;
      }

      const data = await response.json();
      setUploadResult(data);
      setActiveStep('confirm');
      toast.success(`Successfully uploaded ${data.success} contestants`);
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error('Error uploading data. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to check if a field's value matches what would be expected based on IC
  const checkIcBasedFieldMatch = (record: ValidatedRecord, field: string) => {
    const data = record.validatedData;
    const cleanedIC = data.ic?.replace(/\D/g, '');
    
    // If IC is not valid or field has an error, don't check for IC-based match
    if (!cleanedIC || cleanedIC.length !== 12 || record.errors[field]) {
      return true; // Consider it a match if we can't determine
    }
    
    // Calculate expected values based on IC
    const yearPrefix = parseInt(cleanedIC.substring(0, 2)) <= 25 ? '20' : '19';
    const yearOfBirth = parseInt(yearPrefix + cleanedIC.substring(0, 2));
    const currentYear = 2025;
    const calculatedAge = currentYear - yearOfBirth;
    const lastDigit = parseInt(cleanedIC.charAt(11));
    const calculatedGender = lastDigit % 2 === 1 ? 'MALE' : 'FEMALE';
    
    // Calculate expected education level
    let calculatedEduLevel = 'belia';
    if (calculatedAge >= 7 && calculatedAge <= 12) {
      calculatedEduLevel = 'sekolah rendah';
    } else if (calculatedAge >= 13 && calculatedAge <= 17) {
      calculatedEduLevel = 'sekolah menengah';
    }
    
    // Calculate expected class grade
    let calculatedClassGrade = '';
    if (calculatedAge >= 7 && calculatedAge <= 12) {
      calculatedClassGrade = (calculatedAge - 6).toString();
    } else if (calculatedAge >= 13 && calculatedAge <= 17) {
      calculatedClassGrade = (calculatedAge - 12).toString();
    }
    
    // Check if current value matches expected value
    switch (field) {
      case 'gender':
        return data.gender === calculatedGender;
      case 'age':
        return data.age === calculatedAge.toString() || data.age === calculatedAge;
      case 'edu_level':
        return data.edu_level === calculatedEduLevel;
      case 'class_grade':
        return data.class_grade === calculatedClassGrade;
      default:
        return true;
    }
  };
  
  // Helper function to get cell background color based on validation and IC rules
  const getCellBackground = (record: ValidatedRecord, field: string) => {
    // If field has validation error, show red background
    if (record.errors[field]) {
      return 'bg-red-100 dark:bg-red-900/20';
    }
    
    // If field value doesn't match IC-based expectation, show yellow background
    if (record.derivedValues && field in record.derivedValues) {
      const derivedValue = record.derivedValues[field];
      const currentValue = record.validatedData[field];
      
      if (derivedValue && derivedValue.toString() !== currentValue?.toString()) {
        return 'bg-amber-100 dark:bg-amber-900/20';
      }
    }
    
    return '';
  };
  
  // Handle editing a record
  const startEditing = (rowIndex: number) => {
    if (!validationResult) return;
    
    // Initialize form data with current values
    setEditFormData(validationResult.records[rowIndex].validatedData);
    setEditingRowIndex(rowIndex);
  };
  
  // Handle form data changes
  const handleFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle saving edits
  const saveEdits = (rowIndex: number) => {
    if (!validationResult) return;
    
    // Create a copy of the validation result
    const updatedRecords = [...validationResult.records];
    
    // Update the record with the edited data
    updatedRecords[rowIndex] = {
      ...updatedRecords[rowIndex],
      validatedData: {
        ...updatedRecords[rowIndex].validatedData,
        ...editFormData
      }
    };
    
    // Re-validate the updated record
    const validation = validateRecord(updatedRecords[rowIndex].validatedData);
    updatedRecords[rowIndex].isValid = validation.isValid;
    updatedRecords[rowIndex].errors = validation.errors;
    updatedRecords[rowIndex].validatedData = validation.updatedData;
    
    // Update the validation result
    const validCount = updatedRecords.filter(r => r.isValid).length;
    setValidationResult({
      records: updatedRecords,
      totalRecords: updatedRecords.length,
      validRecords: validCount,
      invalidRecords: updatedRecords.length - validCount
    });
    
    // Exit edit mode
    setEditingRowIndex(null);
  };
  

  // Validate a single record
  const validateRecord = (record: Record<string, any>) => {
    const errors: Record<string, string> = {};
    let updatedRecord = { ...record };
    
    // Validate name
    if (!updatedRecord.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    // Validate and process IC number
    const cleanedIC = updatedRecord.ic?.replace(/\D/g, '');
    updatedRecord.ic = cleanedIC; // Always update to cleaned version
    
    if (!cleanedIC || cleanedIC.length !== 12) {
      errors.ic = 'IC must be exactly 12 digits';
    } else {
      // IC is valid, auto-populate other fields based on IC logic
      
      // 1. Extract year, month, and day from IC
      const yearPrefix = parseInt(cleanedIC.substring(0, 2)) <= 25 ? '20' : '19';
      const yearOfBirth = parseInt(yearPrefix + cleanedIC.substring(0, 2));
      
      // 2. Calculate age based on birth year (current year is 2025)
      const currentYear = 2025;
      const calculatedAge = currentYear - yearOfBirth;
      
      // 3. Determine gender based on last digit
      const lastDigit = parseInt(cleanedIC.charAt(11));
      const calculatedGender = lastDigit % 2 === 1 ? 'MALE' : 'FEMALE';
      
      // 4. Determine education level based on age
      let calculatedEduLevel = 'belia';
      if (calculatedAge >= 7 && calculatedAge <= 12) {
        calculatedEduLevel = 'sekolah rendah';
      } else if (calculatedAge >= 13 && calculatedAge <= 17) {
        calculatedEduLevel = 'sekolah menengah';
      }
      
      // 5. Determine class grade based on age
      let calculatedClassGrade = '';
      if (calculatedAge >= 7 && calculatedAge <= 12) {
        calculatedClassGrade = (calculatedAge - 6).toString(); // Primary: ages 7-12 map to grades 1-6
      } else if (calculatedAge >= 13 && calculatedAge <= 17) {
        calculatedClassGrade = (calculatedAge - 12).toString(); // Secondary: ages 13-17 map to grades 1-5
      }
      
      // Apply calculated values if the original values are empty or invalid
      
      // Update gender if invalid or empty
      if (!updatedRecord.gender || !['MALE', 'FEMALE'].includes(updatedRecord.gender)) {
        updatedRecord.gender = calculatedGender;
      }
      
      // Update age if invalid or empty
      const parsedAge = parseInt(updatedRecord.age);
      if (isNaN(parsedAge) || parsedAge <= 0) {
        updatedRecord.age = calculatedAge.toString();
      }
      
      // Update education level if invalid or empty
      const validEduLevels = ['sekolah rendah', 'sekolah menengah', 'belia'];
      if (!updatedRecord.edu_level || !validEduLevels.includes(updatedRecord.edu_level.toLowerCase())) {
        updatedRecord.edu_level = calculatedEduLevel;
      }
      
      // Update class grade if empty or invalid
      const validGrades = ['1', '2', '3', '4', '5', '6', 'PPKI'];
      if (!updatedRecord.class_grade || !validGrades.includes(updatedRecord.class_grade)) {
        updatedRecord.class_grade = calculatedClassGrade;
      }
    }
    
    // Re-validate fields after auto-population
    
    // Validate gender
    if (!['MALE', 'FEMALE'].includes(updatedRecord.gender)) {
      errors.gender = 'Gender must be MALE or FEMALE';
    }
    
    // Validate age
    const age = parseInt(updatedRecord.age);
    if (isNaN(age) || age <= 0) {
      errors.age = 'Age must be a positive number';
    }
    
    // Store the derived values for highlighting purposes
    // Calculate expected values based on IC
    let derivedValues: Record<string, any> = {};
    
    if (cleanedIC && cleanedIC.length === 12) {
      const yearPrefix = parseInt(cleanedIC.substring(0, 2)) <= 25 ? '20' : '19';
      const yearOfBirth = parseInt(yearPrefix + cleanedIC.substring(0, 2));
      const currentYear = 2025;
      const calculatedAge = currentYear - yearOfBirth;
      const lastDigit = parseInt(cleanedIC.charAt(11));
      const calculatedGender = lastDigit % 2 === 1 ? 'MALE' : 'FEMALE';
      
      // Calculate expected education level
      let calculatedEduLevel = 'belia';
      if (calculatedAge >= 7 && calculatedAge <= 12) {
        calculatedEduLevel = 'sekolah rendah';
      } else if (calculatedAge >= 13 && calculatedAge <= 17) {
        calculatedEduLevel = 'sekolah menengah';
      }
      
      // Calculate expected class grade
      let calculatedClassGrade = '';
      if (calculatedAge >= 7 && calculatedAge <= 12) {
        calculatedClassGrade = (calculatedAge - 6).toString();
      } else if (calculatedAge >= 13 && calculatedAge <= 17) {
        calculatedClassGrade = (calculatedAge - 12).toString();
      }
      
      derivedValues = {
        gender: calculatedGender,
        age: calculatedAge.toString(),
        edu_level: calculatedEduLevel,
        class_grade: calculatedClassGrade,
        ic: cleanedIC
      };
    }
    
    // Validate education level
    const validEduLevels = ['sekolah rendah', 'sekolah menengah', 'belia'];
    if (!updatedRecord.edu_level || !validEduLevels.includes(updatedRecord.edu_level.toLowerCase())) {
      errors.edu_level = 'Education level must be one of: sekolah rendah, sekolah menengah, belia';
    }
    
    // Validate class grade
    if (updatedRecord.class_grade) {
      const validGrades = ['1', '2', '3', '4', '5', '6', 'PPKI'];
      if (!validGrades.includes(updatedRecord.class_grade)) {
        errors.class_grade = 'Grade must be 1, 2, 3, 4, 5, 6, or PPKI';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      updatedData: updatedRecord,
      derivedValues
    };
  };

  // Render different steps based on the active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 'upload':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Upload Contestants</CardTitle>
              <CardDescription>
                Upload a CSV file containing contestant information. You can download a template below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label>Upload CSV File</Label>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
                      ${isDragReject ? 'border-destructive bg-destructive/10' : ''}
                      ${file ? 'bg-primary/5' : 'hover:bg-accent'}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Upload className={`h-12 w-12 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                      {file ? (
                        <div className="flex flex-col items-center">
                          <p className="text-base font-medium">File ready for validation</p>
                          <p className="text-sm text-muted-foreground flex items-center mt-1">
                            <FileText className="h-4 w-4 mr-1" />
                            {file.name} ({Math.round(file.size / 1024)} KB)
                          </p>
                        </div>
                      ) : isDragActive ? (
                        <p className="text-base">Drop the CSV file here...</p>
                      ) : (
                        <div className="text-center">
                          <p className="text-base font-medium">Drag & drop a CSV file here</p>
                          <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Make sure your CSV file follows the required format
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/templates/contestants-template.csv" download>
                      <Download className="h-4 w-4 mr-2" /> Download Template
                    </a>
                  </Button>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2 mt-4">
                  <Label>Validating...</Label>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/participants/contestants">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contestants
                </Link>
              </Button>
              <Button 
                onClick={validateFile} 
                disabled={!file || isUploading}
              >
                Validate File <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
        
      case 'verify':
        return validationResult ? (
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
              <CardDescription>
                {validationResult.validRecords} of {validationResult.totalRecords} records are valid.
                Review the data below before uploading.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant={validationResult.invalidRecords > 0 ? "destructive" : "default"}>
                    {validationResult.invalidRecords} issues
                  </Badge>
                  {validationResult.invalidRecords > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={removeInvalidRows}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove Invalid Rows
                    </Button>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Click on a row to edit contestant details
                  </p>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>IC Number</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Education Level</TableHead>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Class Grade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResult.records.map((record, index) => {
                      const isEditing = editingRowIndex === index;
                      const data = record.validatedData;
                      
                      return (
                        <TableRow key={record.rowNumber}>
                          <TableCell>{record.rowNumber}</TableCell>
                          <TableCell className={getCellBackground(record, 'name')}>
                            {isEditing ? (
                              <Input 
                                defaultValue={data.name || ''} 
                                className="h-7 text-xs"
                                onChange={(e) => handleFormChange('name', e.target.value)}
                              />
                            ) : (
                              <div className="flex items-center justify-between">
                                <span>{data.name || '-'}</span>
                                {!isEditing && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 ml-2" 
                                    onClick={() => startEditing(index)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className={getCellBackground(record, 'ic')}>
                            {isEditing ? (
                              <Input 
                                defaultValue={data.ic || ''} 
                                className="h-7 text-xs"
                                onChange={(e) => handleFormChange('ic', e.target.value)}
                              />
                            ) : (
                              data.ic || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select 
                                defaultValue={data.gender || 'MALE'}
                                onValueChange={(value) => handleFormChange('gender', value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MALE">MALE</SelectItem>
                                  <SelectItem value="FEMALE">FEMALE</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              data.gender || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input 
                                type="number" 
                                defaultValue={data.age || ''} 
                                className="h-7 text-xs w-16"
                                onChange={(e) => handleFormChange('age', e.target.value)}
                              />
                            ) : (
                              data.age || '-'
                            )}
                          </TableCell>
                          <TableCell className={getCellBackground(record, 'edu_level')}>
                            {isEditing ? (
                              <Select 
                                defaultValue={data.edu_level || ''}
                                onValueChange={(value) => handleFormChange('edu_level', value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sekolah rendah">Sekolah Rendah</SelectItem>
                                  <SelectItem value="sekolah menengah">Sekolah Menengah</SelectItem>
                                  <SelectItem value="belia">Belia</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              data.edu_level || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input 
                                defaultValue={data.class_name || ''} 
                                className="h-7 text-xs"
                                onChange={(e) => handleFormChange('class_name', e.target.value)}
                              />
                            ) : (
                              data.class_name || '-'
                            )}
                          </TableCell>
                          <TableCell className={getCellBackground(record, 'class_grade')}>
                            {isEditing ? (
                              <Select 
                                defaultValue={data.class_grade || ''}
                                onValueChange={(value) => handleFormChange('class_grade', value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
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
                            ) : (
                              data.class_grade || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex space-x-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 w-7 p-0" 
                                  onClick={() => setEditingRowIndex(null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="h-7 w-7 p-0" 
                                  onClick={() => saveEdits(index)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              record.isValid ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                  <Check className="h-3 w-3 mr-1" /> Valid
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                  <X className="h-3 w-3 mr-1" /> Invalid
                                </Badge>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              {isUploading && (
                <div className="space-y-2 mt-4">
                  <Label>Uploading...</Label>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!validationResult || validationResult.validRecords === 0 || isUploading}
              >
                Upload {validationResult.validRecords} Records <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ) : null;
        
      case 'confirm':
        return uploadResult ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload Complete</CardTitle>
              <CardDescription>
                Your contestants have been successfully uploaded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Successfully uploaded {uploadResult.success} contestants.
                  </AlertDescription>
                </Alert>
                
                {uploadResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Errors</AlertTitle>
                    <AlertDescription>
                      {uploadResult.errors.length} records could not be uploaded.
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">
                            Row {error.row}: {error.message}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={resetUpload}>
                Upload Another File
              </Button>
              <Button asChild>
                <Link href="/participants/contestants">
                  View All Contestants <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/participants" className="hover:text-foreground transition-colors">Participants</Link>
          <span>/</span>
          <Link href="/participants/contestants" className="hover:text-foreground transition-colors">Contestants</Link>
          <span>/</span>
          <span className="text-foreground">Bulk Upload</span>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Contestants</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 ">
        <div className="flex items-center justify-center">
          <Tabs defaultValue={activeStep} className="w-full" value={activeStep}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" disabled={activeStep !== 'upload'}>
                1. Upload File
              </TabsTrigger>
              <TabsTrigger value="verify" disabled={activeStep !== 'verify'}>
                2. Verify Data
              </TabsTrigger>
              <TabsTrigger value="confirm" disabled={activeStep !== 'confirm'}>
                3. Confirmation
              </TabsTrigger>
            </TabsList>
            <div className="mt-6">
              {renderStepContent()}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
