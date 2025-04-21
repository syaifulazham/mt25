'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
import { Upload, Download, FileText, AlertCircle, CheckCircle, ArrowRight, X, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ValidatedRecord {
  rowNumber: number;
  originalData: any;
  validatedData: any;
  isValid: boolean;
  errors: Record<string, string>;
}

interface ValidationResult {
  records: ValidatedRecord[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

export default function BulkUploadModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<'upload' | 'verify' | 'confirm'>('upload');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [contingentId, setContingentId] = useState<number | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  
  // Fetch the first available contingent when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchContingent = async () => {
        try {
          const response = await fetch('/api/participants/contingents');
          if (response.ok) {
            const contingents = await response.json();
            if (contingents && contingents.length > 0) {
              // Find the first contingent where the user is a manager
              const managedContingent = contingents.find((c: { isManager: boolean; status: string; id: number }) => 
                c.isManager && c.status === 'ACTIVE'
              );
              if (managedContingent) {
                setContingentId(managedContingent.id);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching contingents:', error);
        }
      };
      
      fetchContingent();
    }
  }, [isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
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
        console.error('Validation API error:', errorData);
        throw new Error(errorData.error || 'Failed to validate contestants');
      }

      const result = await response.json();
      setValidationResult(result);
      setActiveStep('verify');
      
      if (result.invalidRecords > 0) {
        toast.warning(`${result.invalidRecords} records have validation issues`);
      } else {
        toast.success(`All ${result.totalRecords} records are valid`);
      }
    } catch (error) {
      console.error('Error validating contestants:', error);
      toast.error(`Failed to validate contestants: ${error instanceof Error ? error.message : 'Please try again'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
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
    
    // Add contingent ID if available
    if (contingentId) {
      formData.append('contingentId', contingentId.toString());
    }

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

      // Send the validated data to the API
      const response = await fetch('/api/participants/contestants/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload contestants');
      }

      const result = await response.json();
      setUploadResult(result);
      setActiveStep('confirm');
      
      if (result.success > 0) {
        toast.success(`Successfully uploaded ${result.success} contestants`);
      }
      
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} contestants failed to upload`);
      }
    } catch (error) {
      console.error('Error uploading contestants:', error);
      toast.error('Failed to upload contestants. Please try again.');
    } finally {
      setIsUploading(false);
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
  
  const closeModal = () => {
    setIsOpen(false);
    setFile(null);
    setValidationResult(null);
    setUploadResult(null);
    setUploadProgress(0);
    setActiveStep('upload');
  };
  
  // Helper function to get cell background color based on validation
  const getCellBackground = (record: ValidatedRecord, field: string) => {
    if (record.errors[field]) {
      return 'bg-red-100 dark:bg-red-900/20';
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
  const validateRecord = (record: any) => {
    const errors: Record<string, string> = {};
    
    // Validate name
    if (!record.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    // Validate IC number
    const cleanedIC = record.ic?.replace(/\D/g, '');
    if (!cleanedIC || cleanedIC.length !== 12) {
      errors.ic = 'IC must be exactly 12 digits';
    }
    
    // Validate gender
    if (!['MALE', 'FEMALE'].includes(record.gender)) {
      errors.gender = 'Gender must be MALE or FEMALE';
    }
    
    // Validate age
    const age = parseInt(record.age);
    if (isNaN(age) || age <= 0) {
      errors.age = 'Age must be a positive number';
    }
    
    // Validate education level
    const validEduLevels = ['sekolah rendah', 'sekolah menengah', 'belia'];
    if (!record.edu_level || !validEduLevels.includes(record.edu_level.toLowerCase())) {
      errors.edu_level = 'Education level must be one of: sekolah rendah, sekolah menengah, belia';
    }
    
    // Validate class grade
    if (record.class_grade) {
      const validGrades = ['1', '2', '3', '4', '5', '6', 'PPKI'];
      if (!validGrades.includes(record.class_grade)) {
        errors.class_grade = 'Grade must be 1, 2, 3, 4, 5, 6, or PPKI';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Render different steps based on the active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 'upload':
        return (
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-4">
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label>Upload CSV File</Label>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
                      ${isDragReject ? 'border-destructive bg-destructive/10' : ''}
                      ${file ? 'bg-primary/5' : 'hover:bg-accent'}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className={`h-10 w-10 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                      {file ? (
                        <div className="flex flex-col items-center">
                          <p className="text-sm font-medium">File ready for validation</p>
                          <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <FileText className="h-3 w-3 mr-1" />
                            {file.name} ({Math.round(file.size / 1024)} KB)
                          </p>
                        </div>
                      ) : isDragActive ? (
                        <p className="text-sm">Drop the CSV file here...</p>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm font-medium">Drag & drop a CSV file here</p>
                          <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/templates/contestants-template.csv" download>
                      <Download className="h-4 w-4 mr-2" /> Download Template
                    </a>
                  </Button>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Label>Validating...</Label>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          </div>
        );
        
      case 'verify':
        return validationResult ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Validation Results</h3>
                <p className="text-sm text-muted-foreground">
                  {validationResult.validRecords} of {validationResult.totalRecords} records are valid
                </p>
              </div>
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
            </div>
            
            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>IC Number</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Education Level</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
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
            
            {validationResult.invalidRecords > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Validation Issues</h3>
                <div className="max-h-[150px] overflow-y-auto rounded-md border p-2">
                  <ul className="space-y-1 text-sm">
                    {validationResult.records
                      .filter(record => !record.isValid)
                      .map(record => (
                        <li key={record.rowNumber} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">Row {record.rowNumber}:</span>
                            <ul className="list-disc list-inside ml-2">
                              {Object.entries(record.errors).map(([field, error]) => (
                                <li key={`${record.rowNumber}-${field}`} className="text-xs">
                                  <span className="font-medium">{field}:</span> {error}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
            
            {isUploading && (
              <div className="space-y-2">
                <Label>Uploading...</Label>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        ) : null;
        
      case 'confirm':
        return uploadResult ? (
          <div className="space-y-4 py-4">
            <Alert variant={uploadResult.errors.length > 0 ? "destructive" : "default"}>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Upload Results</AlertTitle>
              <AlertDescription>
                Successfully uploaded {uploadResult.success} contestants.
                {uploadResult.errors.length > 0 && (
                  <span> Failed to upload {uploadResult.errors.length} contestants.</span>
                )}
              </AlertDescription>
            </Alert>

            {uploadResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                <p className="font-medium mb-2">Errors:</p>
                <ul className="space-y-1 text-sm">
                  {uploadResult.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span>
                        Row {error.row}: {error.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null;
        
      default:
        return null;
    }
  };
  
  // Render different footer buttons based on the active step
  const renderFooterButtons = () => {
    switch (activeStep) {
      case 'upload':
        return (
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={validateFile} 
              disabled={!file || isUploading}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Validate
            </Button>
          </>
        );
        
      case 'verify':
        return (
          <>
            <Button variant="outline" onClick={() => setActiveStep('upload')}>
              Back
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!validationResult || validationResult.validRecords === 0 || isUploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload {validationResult?.validRecords || 0} Records
            </Button>
          </>
        );
        
      case 'confirm':
        return (
          <Button variant="default" onClick={closeModal}>
            Close
          </Button>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Contestants</DialogTitle>
          <DialogDescription>
            Upload multiple contestants at once using a CSV or Excel file.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-2">
            <Badge variant={activeStep === 'upload' ? 'default' : 'outline'} className="px-3">
              1. Upload
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={activeStep === 'verify' ? 'default' : 'outline'} className="px-3">
              2. Verify
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={activeStep === 'confirm' ? 'default' : 'outline'} className="px-3">
              3. Confirm
            </Badge>
          </div>
        </div>

        {renderStepContent()}

        <DialogFooter>
          {renderFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
