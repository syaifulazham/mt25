'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from "@/lib/i18n/language-context";
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
  const { t } = useLanguage(); // Initialize language context
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
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
      toast.error(t('contestant.bulk.error_no_file'));
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
        toast.error(errorData.error || t('contestant.bulk.error_validation'));
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
        toast.info(t('contestant.bulk.ic_autofill'));
      }
      
      setValidationResult(data);
      setActiveStep('verify');
    } catch (error) {
      console.error('Error validating file:', error);
      toast.error(t('contestant.bulk.error_validating'));
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
    
    toast.success(t('contestant.bulk.rows_removed'));
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
      toast.error(t('contestant.bulk.error_no_valid_records'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Only include valid records
    const validRecords = validationResult.records
      .filter(record => record.isValid)
      .map(record => record.validatedData);
    
    // Split records into batches of 50
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      batches.push(validRecords.slice(i, i + BATCH_SIZE));
    }
    
    // Set total chunks for progress tracking
    setTotalChunks(batches.length);
    
    // Track overall results
    const overallResults = {
      success: 0,
      errors: [] as Array<{ row: number; message: string }>,
      contingent: ''
    };
    
    try {
      let batchesCompleted = 0;
      let totalBatches = batches.length;
      
      // Upload each batch sequentially
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const formData = new FormData();
        formData.append('data', JSON.stringify(batch));
        
        // Update progress based on batches completed
        setUploadProgress(Math.floor((batchesCompleted / totalBatches) * 100));
        setCurrentChunk(batchesCompleted);
        
        // Show toast for each batch
        toast.info(`${t('contestant.bulk.uploading_batch')} ${i+1}/${totalBatches} (${batch.length} ${t('contestant.bulk.records')})`);
        
        // Send this batch to the API
        const response = await fetch('/api/participants/contestants/bulk-upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          toast.error(`${t('contestant.bulk.error_batch')} ${i+1}: ${errorData.error || t('contestant.bulk.error_upload')}`);
          // Continue with next batch despite error
        } else {
          const data = await response.json();
          
          // Add results from this batch to overall results
          overallResults.success += data.success;
          if (data.errors && Array.isArray(data.errors)) {
            overallResults.errors = [...overallResults.errors, ...data.errors];
          }
          if (!overallResults.contingent && data.contingent) {
            overallResults.contingent = data.contingent;
          }
          
          toast.success(`${t('contestant.bulk.batch_success')} ${i+1}: ${data.success} ${t('contestant.bulk.records_uploaded')}`);
        }
        
        batchesCompleted++;
        setUploadProgress(Math.floor((batchesCompleted / totalBatches) * 100));
        setCurrentChunk(batchesCompleted);
        
        // Small delay between batches to avoid overwhelming the server
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setUploadProgress(100);
      setUploadResult(overallResults);
      setActiveStep('confirm');
      toast.success(t('contestant.bulk.success_upload').replace('{count}', overallResults.success.toString()));
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error(t('contestant.bulk.error_uploading'));
    } finally {
      setIsUploading(false);
      // Reset chunk tracking when upload is complete
      setCurrentChunk(0);
      setTotalChunks(0);
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
      errors.name = t('contestant.bulk.error_name_required');
    }
    
    // Validate and process IC number
    const cleanedIC = updatedRecord.ic?.replace(/\D/g, '');
    updatedRecord.ic = cleanedIC; // Always update to cleaned version
    
    if (!cleanedIC || cleanedIC.length !== 12) {
      errors.ic = t('contestant.bulk.error_ic_format');
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
      errors.gender = t('contestant.bulk.error_gender_format');
    }
    
    // Validate age
    const age = parseInt(updatedRecord.age);
    if (isNaN(age) || age <= 0) {
      errors.age = t('contestant.bulk.error_age_format');
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
      errors.edu_level = t('contestant.bulk.error_edu_level_format');
    }
    
    // Validate class grade
    if (updatedRecord.class_grade) {
      const validGrades = ['1', '2', '3', '4', '5', '6', 'PPKI'];
      if (!validGrades.includes(updatedRecord.class_grade)) {
        errors.class_grade = t('contestant.bulk.error_grade_format');
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
              <CardTitle>{t('contestant.bulk.title')}</CardTitle>
              <CardDescription>
                {t('contestant.bulk.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label>{t('contestant.bulk.upload_csv')}</Label>
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
                          <p className="text-base font-medium">{t('contestant.bulk.file_ready')}</p>
                          <p className="text-sm text-muted-foreground flex items-center mt-1">
                            <FileText className="h-4 w-4 mr-1" />
                            {file.name} ({Math.round(file.size / 1024)} KB)
                          </p>
                        </div>
                      ) : isDragActive ? (
                        <p className="text-base">{t('contestant.bulk.drop_here')}</p>
                      ) : (
                        <div className="text-center">
                          <p className="text-base font-medium">{t('contestant.bulk.drag_drop')}</p>
                          <p className="text-sm text-muted-foreground mt-1">{t('contestant.bulk.or_click')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {t('contestant.bulk.csv_format')}
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/templates/contestants-template.csv" download>
                      <Download className="h-4 w-4 mr-2" /> {t('contestant.bulk.download_template')}
                    </a>
                  </Button>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2 mt-4">
                  <Label>{t('contestant.bulk.validating')}</Label>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">{uploadProgress}% {t('contestant.bulk.complete')}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/participants/contestants">
                  <ArrowLeft className="h-4 w-4 mr-2" /> {t('contestant.bulk.back_to_contestants')}
                </Link>
              </Button>
              <Button 
                onClick={validateFile} 
                disabled={!file || isUploading}
              >
                {t('contestant.bulk.validate_file')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
        
      case 'verify':
        return validationResult ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('contestant.bulk.validation_results')}</CardTitle>
              <CardDescription>
                {validationResult.validRecords} {t('contestant.bulk.of')} {validationResult.totalRecords} {t('contestant.bulk.records_are_valid')}.
                {t('contestant.bulk.review_data')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant={validationResult.invalidRecords > 0 ? "destructive" : "default"}>
                    {validationResult.invalidRecords} {t('contestant.bulk.issues')}
                  </Badge>
                  {validationResult.invalidRecords > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={removeInvalidRows}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" /> {t('contestant.bulk.remove_invalid')}
                    </Button>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('contestant.bulk.click_to_edit')}
                  </p>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">{t('contestant.bulk.row')}</TableHead>
                      <TableHead>{t('contestant.bulk.name')}</TableHead>
                      <TableHead>{t('contestant.bulk.ic_number')}</TableHead>
                      <TableHead>{t('contestant.bulk.gender')}</TableHead>
                      <TableHead>{t('contestant.bulk.age')}</TableHead>
                      <TableHead>{t('contestant.bulk.education_level')}</TableHead>
                      <TableHead>{t('contestant.bulk.class_name')}</TableHead>
                      <TableHead>{t('contestant.bulk.class_grade')}</TableHead>
                      <TableHead>{t('contestant.bulk.status')}</TableHead>
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
                                  <Check className="h-3 w-3 mr-1" /> {t('contestant.bulk.valid')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                  <X className="h-3 w-3 mr-1" /> {t('contestant.bulk.invalid')}
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
                  <Label>{t('contestant.bulk.uploading')}</Label>
                  <Progress value={uploadProgress} className="h-2" />
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">{t('contestant.bulk.processing_chunks')}: {currentChunk}/{totalChunks}</span>
                    <span className="text-muted-foreground">{uploadProgress}% {t('contestant.bulk.complete')}</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> {t('contestant.bulk.back')}
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!validationResult || validationResult.validRecords === 0 || isUploading}
              >
                {t('contestant.bulk.upload')} {validationResult.validRecords} {t('contestant.bulk.records')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ) : null;
        
      case 'confirm':
        return uploadResult ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('contestant.bulk.upload_complete')}</CardTitle>
              <CardDescription>
                {t('contestant.bulk.upload_success')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>{t('contestant.bulk.success_title')}</AlertTitle>
                  <AlertDescription>
                    {t('contestant.bulk.success_description')} {uploadResult.success} {t('contestant.bulk.contestants')}.
                  </AlertDescription>
                </Alert>
                
                {uploadResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('contestant.bulk.errors_title')}</AlertTitle>
                    <AlertDescription>
                      {uploadResult.errors.length} {t('contestant.bulk.records_not_uploaded')}
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {t('contestant.bulk.row')} {error.row}: {error.message}
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
                {t('contestant.bulk.upload_another')}
              </Button>
              <Button asChild>
                <Link href="/participants/contestants">
                  {t('contestant.bulk.view_all')} <ArrowRight className="ml-2 h-4 w-4" />
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
          <Link href="/participants" className="hover:text-foreground transition-colors">{t('navigation.participants')}</Link>
          <span>/</span>
          <Link href="/participants/contestants" className="hover:text-foreground transition-colors">{t('navigation.contestants')}</Link>
          <span>/</span>
          <span className="text-foreground">{t('contestant.bulk.breadcrumb')}</span>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('contestant.bulk.page_title')}</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 ">
        <div className="flex items-center justify-center">
          <Tabs defaultValue={activeStep} className="w-full" value={activeStep}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" disabled={activeStep !== 'upload'}>
                1. {t('contestant.bulk.step_upload')}
              </TabsTrigger>
              <TabsTrigger value="verify" disabled={activeStep !== 'verify'}>
                2. {t('contestant.bulk.step_verify')}
              </TabsTrigger>
              <TabsTrigger value="confirm" disabled={activeStep !== 'confirm'}>
                3. {t('contestant.bulk.step_confirm')}
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
