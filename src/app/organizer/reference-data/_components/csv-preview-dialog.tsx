'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parse } from 'papaparse';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface CsvPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirm: () => void;
}

// List of expected fields for School records
const REQUIRED_SCHOOL_FIELDS = ['code', 'name', 'level', 'category', 'state'];
const OPTIONAL_SCHOOL_FIELDS = [
  'district',    // May be mapped to 'ppd' in some schemas
  'ppd',         // Alternative name for district 
  'postcode',
  'address',
  'contact',
  'email',
  'city',        // From prisma schema
  'latitude',    // From prisma schema (note: will be converted from string)
  'longitude',   // From prisma schema (note: will be converted from string)
  'stateId'      // Sometimes provided directly
];
const ALL_SCHOOL_FIELDS = [...REQUIRED_SCHOOL_FIELDS, ...OPTIONAL_SCHOOL_FIELDS];

export function CsvPreviewDialog({ isOpen, onClose, file, onConfirm }: CsvPreviewDialogProps) {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawPreview, setRawPreview] = useState<string>('');
  const [stats, setStats] = useState<{
    totalRows: number; 
    validRows: number;
    missingFields: string[];
    unknownFields: string[];
    parseErrors: {row: number; message: string}[];
  }>({ 
    totalRows: 0, 
    validRows: 0, 
    missingFields: [], 
    unknownFields: [],
    parseErrors: []
  });
  
  // Parse the CSV file for preview when dialog opens
  // Use useEffect instead of useState for side effects
  useEffect(() => {
    if (!file || !isOpen) return;
    
    setIsLoading(true);
    setError(null);
    
    // First, try to read the raw content of the file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        // Show the first few lines of raw CSV content
        const lines = content.split('\n').slice(0, 10);
        setRawPreview(lines.join('\n'));
      }
    };
    reader.readAsText(file);
    
    // Parse the CSV file
    parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 100, // Only preview first 100 rows
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        console.log('CSV Preview Results:', results);
        
        if (results.data && Array.isArray(results.data) && results.data.length > 0) {
          setPreviewData(results.data.slice(0, 100));
          
          // Get headers - use meta.fields if available, otherwise extract from first row
          const headerFields = results.meta.fields || 
            (results.data[0] ? Object.keys(results.data[0]) : []);
            
          setHeaders(headerFields);
          
          // Find missing required fields and unknown fields
          const missingFields = REQUIRED_SCHOOL_FIELDS.filter(field => !headerFields.includes(field));
          const unknownFields = headerFields.filter(field => !ALL_SCHOOL_FIELDS.includes(field));
          
          // Check for parse errors and collect them
          const parseErrors = results.errors.map(err => ({
            row: typeof err.row === 'number' ? err.row : 0,
            message: err.message
          }));
          
          // Count rows with required fields
          const validRows = results.data.filter((row: any) => 
            REQUIRED_SCHOOL_FIELDS.every(field => 
              row[field] && String(row[field]).trim().length > 0
            )
          ).length;
          
          setStats({
            totalRows: results.data.length,
            validRows: validRows,
            missingFields,
            unknownFields,
            parseErrors
          });
          
          // Set general error message if issues were found
          if (missingFields.length > 0 || parseErrors.length > 0) {
            let errorMsg = [];
            if (missingFields.length > 0) {
              errorMsg.push(`Missing required fields: ${missingFields.join(', ')}`); 
            }
            if (parseErrors.length > 0) {
              errorMsg.push(`Found ${parseErrors.length} errors during parsing`);
            }
            setError(errorMsg.join('. '));
          }
        } else {
          setError('CSV file contains no valid data or has invalid format.');
        }
        setIsLoading(false);
      },
      error: (error) => {
        console.error('CSV Preview Error:', error);
        setError(error.message);
        setIsLoading(false);
      }
    });
  }, [file, isOpen]);
  
  // Handle empty state
  if (!file) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] flex flex-col" style={{ overflow: 'hidden' }}>
        <div className="flex flex-col flex-1 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle>CSV Preview: {file?.name}</DialogTitle>
          <DialogDescription>
            Showing first 100 rows from {file?.name} ({(file?.size / 1024).toFixed(1)} KB)
          </DialogDescription>
        </DialogHeader>
        
        {/* Raw CSV Preview */}
        {rawPreview && (
          <div className="mb-4">
            <div className="font-medium text-sm mb-1 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Raw CSV content (first few lines):
            </div>
            <pre className="bg-slate-50 text-slate-800 p-2 rounded text-xs overflow-x-auto border">
              {rawPreview}
            </pre>
          </div>
        )}
        
        {/* Error messages */}
        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Diagnostics section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          {/* Required fields check */}
          <Alert variant={stats.missingFields.length === 0 ? "default" : "destructive"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Required Fields:</span> {stats.missingFields.length === 0 ? 'All present' : 
                <span className="text-destructive">{stats.missingFields.join(', ')} missing</span>}
            </AlertDescription>
          </Alert>
          
          {/* Valid rows check */}
          <Alert variant={stats.validRows === stats.totalRows ? "default" : "destructive"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Valid Rows:</span> {stats.validRows} of {stats.totalRows}
              {stats.validRows < stats.totalRows && 
                <span className="text-destructive"> (Some rows will be skipped)</span>}
            </AlertDescription>
          </Alert>
        </div>
        
        {/* Parse errors, if any */}
        {stats.parseErrors.length > 0 && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <div className="flex-1">
              <p className="font-medium">Parse Errors:</p>
              <ul className="text-xs list-disc pl-4 mt-1">
                {stats.parseErrors.slice(0, 5).map((err, index) => (
                  <li key={index}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {stats.parseErrors.length > 5 && <li>...and {stats.parseErrors.length - 5} more errors</li>}
              </ul>
            </div>
          </Alert>
        )}
        
        {/* Unknown fields, if any */}
        {stats.unknownFields.length > 0 && (
          <Alert variant="default" className="mb-2 border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <span className="font-medium">Additional Fields:</span> {stats.unknownFields.join(', ')}
              <p className="text-xs">These fields are not recognized in the standard schema but may be imported if your system supports them.</p>
            </AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="relative">
            {/* Horizontal scroll indicator */}
            <div className="absolute right-2 top-2 z-10 bg-white/90 p-2 text-xs text-muted-foreground rounded border shadow-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 9l-6 6 6 6"/>
                <path d="M20 9l-6 6 6 6"/>
              </svg>
              <span>Scroll horizontally to see all columns</span>
            </div>
            
            <div className="overflow-auto max-h-[50vh] relative rounded border">
              {previewData.length > 0 ? (
                <Table className="relative w-auto">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-20 min-w-[40px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ backgroundColor: 'var(--background)' }}>
                        #
                      </TableHead>
                      {headers.map((header, index) => (
                        <TableHead key={index} className="min-w-[120px] max-w-[200px] truncate" title={header}>
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell className="sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ backgroundColor: 'var(--background)' }}>
                          {rowIndex + 1}
                        </TableCell>
                        {headers.map((header, cellIndex) => {
                          const cellValue = row[header] ? String(row[header]) : '';
                          const truncatedValue = cellValue.length > 50 ? 
                            cellValue.substring(0, 50) + '...' : cellValue;
                            
                          return (
                            <TableCell 
                              key={cellIndex} 
                              className="whitespace-nowrap max-w-[250px] text-ellipsis overflow-hidden"
                              title={cellValue} // Show full text on hover
                              style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {truncatedValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : error ? (
                <div className="py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium">No data could be parsed from this file</p>
                    <p className="text-sm text-muted-foreground">Check that your CSV is properly formatted with comma separators and has headers.</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium">No preview data available</p>
                    <p className="text-sm text-muted-foreground">Please select a valid CSV file to preview.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        </div>
        <DialogFooter className="gap-2 mt-4 sticky bottom-0 bg-background py-2 border-t z-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm} 
            disabled={isLoading || previewData.length === 0}
            className="ml-2"
          >
            Continue with Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
