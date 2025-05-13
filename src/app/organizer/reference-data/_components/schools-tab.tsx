"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { schoolApi, stateApi } from "@/lib/api-client";
import { Loader2, Upload, FileText, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CsvPreviewDialog } from "./csv-preview-dialog";
import { uploadCsvInChunks } from "./csv-chunk-uploader";
import { parseCsv, normalizeCsvData } from "./csv-parser";

// Type definitions for improved TypeScript support
type PreviewData = {
  headers: string[];
  data: any[];
  rawCsv: string;
  parseErrors: any[];
  isStandardFormat?: boolean;
};

type UploadResults = {
  created: number;
  updated: number;
  skipped: number;
  errors: any[];
  total: number;
};

// Define school levels with display name and value pairs for better UX
interface SchoolLevel {
  display: string;
  value: string;
}

const schoolLevels: SchoolLevel[] = [
  { display: 'Primary', value: 'Rendah' },
  { display: 'Secondary', value: 'Menengah' }
];

// Official school categories in Malaysia
const schoolCategories = [
  "category",
  "AK",
  "K9",
  "KT6",
  "KV",
  "MODEL KHAS",
  "MRSM",
  "SBJK",
  "SBP",
  "SEK. ANTARABANGSA",
  "SEK. EKSPATRIAT",
  "SEK. MEN. PERSENDIRIAN CINA",
  "SEK. MENENGAH AGAMA",
  "SEK. MENENGAH AKADEMIK",
  "SEK. PENDIDIKAN KHAS",
  "SEK. RENDAH AGAMA",
  "SEK. RENDAH AKADEMIK",
  "SENI",
  "SJKC",
  "SJKT",
  "SK",
  "SK KHAS",
  "SM KHAS",
  "SM SABK",
  "SMK",
  "SMKA",
  "SMT",
  "SR SABK",
  "SUKAN"
];

// Helper function to get display name from level value
const getSchoolLevelDisplay = (value: string): string => {
  const level = schoolLevels.find(l => l.value === value);
  return level ? level.display : value;
};

export function SchoolsTab() {
  const [schools, setSchools] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // CSV Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  
  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 20, 50, 100];

  // Filter state
  const [filters, setFilters] = useState({
    level: null as string | null,
    category: null as string | null,
    ppd: null as string | null,
    stateId: null as string | null,
  });
  const [uniquePpds, setUniquePpds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [newSchool, setNewSchool] = useState({
    name: "",
    code: "",
    level: "",
    category: "",
    ppd: "",
    address: "",
    city: "",
    postcode: "",
    stateId: "",
  });
  const [editSchool, setEditSchool] = useState<{
    id: number;
    name: string;
    code: string;
    level: string;
    category: string;
    ppd: string | null;
    address: string | null;
    city: string | null;
    postcode: string | null;
    stateId: number;
  } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<number | null>(null);

  // Previous CSV upload state declarations have been moved above

  // Fetch schools and states
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch states (no pagination needed)
        const statesData = await stateApi.getStates();
        setStates(statesData);

        // Fetch schools with pagination
        const params: any = {
          page: currentPage,
          pageSize: pageSize,
        };

        if (searchTerm) {
          params.search = searchTerm;
        }

        // Add filters if they are set and not null or "all"
        if (filters.level && filters.level !== "all") params.level = filters.level;
        if (filters.category && filters.category !== "all") params.category = filters.category;
        if (filters.ppd && filters.ppd !== "all") params.ppd = filters.ppd;
        if (filters.stateId && filters.stateId !== "all") params.stateId = filters.stateId;

        const schoolsResponse = await schoolApi.getSchoolsPaginated(params);
        setSchools(schoolsResponse.data);
        setTotalPages(schoolsResponse.totalPages);
        setTotalCount(schoolsResponse.totalCount);

        // Extract unique PPDs for filter dropdown
        if (uniquePpds.length === 0) {
          const allSchools = await schoolApi.getSchools();
          const ppds = allSchools
            .map((school) => school.ppd)
            .filter((ppd, index, self) =>
              ppd && self.indexOf(ppd) === index
            )
            .sort();
          setUniquePpds(ppds);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load schools data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, pageSize, searchTerm, filters]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getStateName = (stateId: number) => {
    const state = states.find((s) => s.id === stateId);
    return state ? state.name : "Unknown";
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page when changing filters
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      level: null,
      category: null,
      ppd: null,
      stateId: null,
    });
    setCurrentPage(1);
  };

  const handleAddSchool = async () => {
    if (!newSchool.name.trim() || !newSchool.code.trim()) {
      toast.error("School name and code cannot be empty");
      return;
    }

    if (!newSchool.level || !newSchool.category || !newSchool.stateId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await schoolApi.createSchool({
        name: newSchool.name.trim(),
        code: newSchool.code.trim(),
        level: newSchool.level,
        category: newSchool.category,
        ppd: newSchool.ppd.trim() || null,
        address: newSchool.address.trim() || null,
        city: newSchool.city.trim() || null,
        postcode: newSchool.postcode.trim() || null,
        stateId: parseInt(newSchool.stateId),
        latitude: null,
        longitude: null,
      });

      // Refresh schools data with pagination
      const schoolsResponse = await schoolApi.getSchoolsPaginated({
        page: 1, // Go to first page to see the new school
        pageSize: pageSize,
      });
      setSchools(schoolsResponse.data);
      setTotalPages(schoolsResponse.totalPages);
      setTotalCount(schoolsResponse.totalCount);
      setCurrentPage(1);

      setNewSchool({
        name: "",
        code: "",
        level: "",
        category: "",
        ppd: "",
        address: "",
        city: "",
        postcode: "",
        stateId: "",
      });
      setIsAddDialogOpen(false);
      toast.success("School added successfully");
    } catch (error: any) {
      console.error("Error adding school:", error);
      toast.error(error.message || "Failed to add school");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSchool = async () => {
    if (!editSchool || !editSchool.name.trim() || !editSchool.code.trim()) {
      toast.error("School name and code cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await schoolApi.updateSchool(editSchool.id.toString(), {
        name: editSchool.name.trim(),
        code: editSchool.code.trim(),
        level: editSchool.level,
        category: editSchool.category,
        ppd: editSchool.ppd,
        address: editSchool.address,
        city: editSchool.city,
        postcode: editSchool.postcode,
        stateId: editSchool.stateId,
        latitude: null,
        longitude: null,
      });

      // Refresh schools data with current pagination
      const schoolsResponse = await schoolApi.getSchoolsPaginated({
        page: currentPage,
        pageSize: pageSize,
        search: searchTerm,
      });
      setSchools(schoolsResponse.data);
      setTotalPages(schoolsResponse.totalPages);
      setTotalCount(schoolsResponse.totalCount);

      setEditSchool(null);
      setIsEditDialogOpen(false);
      toast.success("School updated successfully");
    } catch (error: any) {
      console.error("Error updating school:", error);
      toast.error(error.message || "Failed to update school");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (schoolToDelete === null) return;

    setIsSubmitting(true);
    try {
      await schoolApi.deleteSchool(schoolToDelete.toString());

      // Refresh schools data with pagination
      const schoolsResponse = await schoolApi.getSchoolsPaginated({
        page: currentPage,
        pageSize: pageSize,
        search: searchTerm,
      });

      // If we deleted the last item on the page, go to previous page
      if (schoolsResponse.data.length === 0 && currentPage > 1) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);

        // Fetch data for the previous page
        const prevPageResponse = await schoolApi.getSchoolsPaginated({
          page: newPage,
          pageSize: pageSize,
          search: searchTerm,
        });

        setSchools(prevPageResponse.data);
        setTotalPages(prevPageResponse.totalPages);
        setTotalCount(prevPageResponse.totalCount);
      } else {
        // Otherwise just update with current page data
        setSchools(schoolsResponse.data);
        setTotalPages(schoolsResponse.totalPages);
        setTotalCount(schoolsResponse.totalCount);
      }

      setSchoolToDelete(null);
      setIsDeleteDialogOpen(false);
      toast.success("School deleted successfully");
    } catch (error: any) {
      console.error("Error deleting school:", error);
      toast.error(error.message || "Failed to delete school");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show CSV preview before processing
  const showCsvPreview = async (file: File) => {
    try {
      // Read and parse the CSV file
      const text = await file.text();
      const result = parseCsv(text);
      const { data, meta, errors } = result;
      
      // Check if this is the standardized format CSV from /data/school.csv
      const isStandardFormat = 
        meta.fields && 
        meta.fields[0] === 'name' && 
        meta.fields.includes('code') &&
        meta.fields.includes('level') &&
        meta.fields.includes('category') &&
        meta.fields.includes('state');
      
      if (isStandardFormat) {
        console.log('Detected standard format CSV from data/school.csv');
      }
      
      // Show preview dialog
      setPreviewData({
        headers: meta.fields || [],
        data: data.slice(0, 100),
        rawCsv: text,
        parseErrors: errors,
        isStandardFormat: isStandardFormat
      });
      setShowPreview(true);
    } catch (error: any) {
      toast.error(`Error parsing CSV: ${error.message}`);
    }
  };
  
  // Show error report details for failed records
  const showErrorReport = (errors: any[]) => {
    // Group errors by type
    interface ErrorGroup {
      count: number;
      examples: string[];
    }
    
    const errorTypes: Record<string, ErrorGroup> = {};
    errors.forEach(err => {
      const message = err.error || err.message || 'Unknown error';
      if (!errorTypes[message]) {
        errorTypes[message] = { count: 0, examples: [] };
      }
      errorTypes[message].count++;
      if (errorTypes[message].examples.length < 3) {
        errorTypes[message].examples.push(err.code || err.row || 'Unknown');
      }
    });
    
    // Sort errors by count
    const sortedErrors = Object.entries(errorTypes)
      .sort(([, a], [, b]) => b.count - a.count);
    
    // Format a report
    return (
      <div className="text-sm">
        <p className="font-medium mb-2">Error Summary:</p>
        <div className="max-h-[200px] overflow-auto">
          {sortedErrors.map(([error, data], i) => (
            <div key={i} className="mb-2 pb-2 border-b">
              <p className="font-medium text-red-600">{error}</p>
              <p>{data.count} occurrences</p>
              <p className="text-xs">Examples: {data.examples.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Process CSV file after preview confirmation
  const processCsvFile = async () => {
    if (!selectedCsvFile) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Show different toast based on file size
    const fileSizeMB = (selectedCsvFile.size / (1024 * 1024)).toFixed(2);
    const toastId = toast.loading(
      <div className="flex items-center gap-2">
        <FileText size={18} />
        <span>Processing {fileSizeMB}MB CSV file in chunks. This may take a few minutes.</span>
      </div>
    );
    
    try {
      // Last resort manual parsing function in case standard parsing fails
      const manualParseCsv = async (file: File) => {
        console.log('Using manual CSV parsing method');
        
        // Read the file as text
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
          throw new Error('CSV file appears to be empty');
        }
        
        // Special handling for the standard school.csv format with known column order
        // This is the format from /data/school.csv
        if (file.name === 'school.csv' || 
            (lines[0].includes('"name"') && lines[0].includes('"ppd"') && 
             lines[0].includes('"level"') && lines[0].includes('"category"') && 
             lines[0].includes('"code"'))) {
          console.log('Detected standard school.csv format, applying special mapping');
          
          // For this format, we know the exact column structure
          // "name","ppd","level","category","code","address","postcode","city","state","longitude","latitude"
          const standardHeaders = ['name', 'ppd', 'level', 'category', 'code', 'address', 'postcode', 'city', 'state', 'longitude', 'latitude'];
          
          // Create normalized data with exact field mapping
          const data = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim().length === 0) continue;
            
            // Parse CSV properly with quote handling
            const cleanLine = lines[i].replace(/,,/g, ',"",'); // Handle empty fields
            const values = [];
            let inQuote = false;
            let currentValue = '';
            
            for (let j = 0; j < cleanLine.length; j++) {
              const char = cleanLine[j];
              if (char === '"') {
                inQuote = !inQuote;
              } else if (char === ',' && !inQuote) {
                values.push(currentValue.trim());
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim()); // Add the last value
            
            // Map to required fields for the API
            const row: any = {};
            for (let j = 0; j < standardHeaders.length && j < values.length; j++) {
              const fieldName = standardHeaders[j];
              // Clean the value and remove quotes if present
              let value = values[j].replace(/^"|"$/g, '').trim();
              row[fieldName] = value;
            }
            
            data.push(row);
          }
          
          console.log(`Parsed ${data.length} rows from standard school.csv format`);
          console.log('Sample row:', data.length > 0 ? JSON.stringify(data[0]) : 'No data');
          
          return { data, headers: ['code', 'name', 'level', 'category', 'state', 'ppd', 'address', 'city', 'postcode', 'longitude', 'latitude'] };
        }
        
        // Detect the delimiter by testing which one gives more fields
        const delimiters = [',', ';', '\t', '|'];
        let bestDelimiter = ',';
        let maxFields = 0;
        
        for (const delimiter of delimiters) {
          const fieldCount = lines[0].split(delimiter).length;
          if (fieldCount > maxFields) {
            maxFields = fieldCount;
            bestDelimiter = delimiter;
          }
        }
        
        console.log(`Using delimiter: '${bestDelimiter}' (${maxFields} fields detected)`);
        
        // Create a mapping for standard field names to possible variations
        const headerMap = {
          'code': ['kod', 'code', 'school code', 'kod sekolah', 'id', 'school id', 'schoolcode'],
          'name': ['name', 'nama', 'school name', 'nama sekolah', 'school', 'schoolname'],
          'level': ['level', 'tahap', 'school level', 'tahap sekolah', 'jenis', 'schoollevel'],
          'category': ['category', 'kategori', 'jenis', 'type', 'school category', 'schoolcategory'],
          'state': ['state', 'negeri', 'neg', 'state name', 'nama negeri']
        };
        
        // Extract original headers and create mappings
        const originalHeaders = lines[0].split(bestDelimiter).map(h => h.trim());
        const headerMappings: Record<number, string> = {};
        
        // Map headers to standard field names
        originalHeaders.forEach((header, index) => {
          const headerText = header.toLowerCase();
          
          // Check each standard field for potential matches
          for (const [standardField, variations] of Object.entries(headerMap)) {
            if (variations.includes(headerText) || 
                variations.some(v => headerText.includes(v))) {
              headerMappings[index] = standardField;
              console.log(`Mapped header '${header}' to standard field '${standardField}'`);
              break;
            }
          }
        });
        
        console.log('Header mappings:', headerMappings);
        
        // Check for missing required fields
        const requiredFields = ['code', 'name', 'level', 'category', 'state'];
        const mappedFields = Object.values(headerMappings);
        const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
        
        if (missingFields.length > 0) {
          console.warn(`Missing required fields: ${missingFields.join(', ')}`);
          console.log('Available headers:', originalHeaders.join(', '));
          
          // For debugging only - optionally assign default columns if certain patterns are detected
          if (originalHeaders.length >= 5 && missingFields.length <= 2) {
            console.log('Attempting to guess mappings for missing fields...');
            // This is a simplistic approach - you might want to improve this
            const unmappedColumns = originalHeaders.map((_, i) => i)
              .filter(i => !Object.prototype.hasOwnProperty.call(headerMappings, i));
            
            missingFields.forEach((field, i) => {
              if (i < unmappedColumns.length) {
                headerMappings[unmappedColumns[i]] = field;
                console.log(`Assigned ${field} to column ${unmappedColumns[i]} (${originalHeaders[unmappedColumns[i]]})`);
              }
            });
          }
        }
        
        // Process data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim().length === 0) continue;
          
          const values = lines[i].split(bestDelimiter);
          const row: any = {};
          
          // Initialize required fields 
          requiredFields.forEach(field => {
            row[field] = '';
          });
          
          // Map values using our header mappings
          for (let j = 0; j < originalHeaders.length; j++) {
            if (j >= values.length) continue; // Skip if row doesn't have enough values
            
            const standardField = headerMappings[j];
            const value = values[j] ? values[j].trim() : '';
            
            if (standardField) {
              // For mapped fields, store in the standard field name
              if (standardField === 'state' && value) {
                // Normalize state names
                row[standardField] = value.toLowerCase()
                  .replace(/\bwp\b/i, 'wilayah persekutuan')
                  .replace(/\bk\.?l\b/i, 'kuala lumpur')
                  .replace(/\bp\.?pinang\b/i, 'pulau pinang');
              } else {
                row[standardField] = value;
              }
            } else {
              // For unmapped fields, store with original header
              row[originalHeaders[j].toLowerCase()] = value;
            }
          }
          
          // Only add rows that have at least basic data
          if (row.code || row.name) {
            data.push(row);
          }
        }
        
        console.log(`Manually parsed ${data.length} rows with mappings:`, headerMappings);
        console.log('Sample parsed row:', data.length > 0 ? JSON.stringify(data[0]) : 'No data');
        
        // Return both the data and the field mappings for the API
        return { 
          data, 
          headers: requiredFields
        };
      };
      
      // First try standard CSV parsing method
      let results;
      try {
        // Use the standard chunked uploader
        results = await uploadCsvInChunks(
          selectedCsvFile,
          '/api/schools/upload/chunks',
        250, // 250 records per chunk
        (progress, total, phase) => {
          // Update progress based on current phase
          if (phase === 'parsing') {
            // During parsing, go from 0-40%
            setUploadProgress(Math.floor(progress * 0.4));
          } else {
            // During uploading, go from 40-100%
            const uploadProgress = 40 + Math.floor(progress * 0.6);
            setUploadProgress(uploadProgress);
          }
          toast.loading(
            <div className="flex items-center gap-2">
              <span>{phase === 'parsing' ? 'Parsing CSV file' : 'Uploading records'}: {progress}% complete</span>
            </div>,
            { id: toastId }
          );
        }
      );

      setUploadProgress(100);
      setUploadResults(results);
      
      // Refresh the schools list
      const schoolsData = await schoolApi.getSchoolsPaginated({
        page: 1,
        pageSize: pageSize,
      });
      
      setSchools(schoolsData.data);
      setTotalPages(schoolsData.totalPages);
      setTotalCount(schoolsData.totalCount);

      // Dismiss the loading toast and show success
      toast.dismiss(toastId);
      toast.success(
        <div className="flex flex-col gap-1">
          <div>CSV upload completed successfully</div>
          <div className="text-sm text-muted-foreground">
            {results.created} created, {results.updated} updated, {results.skipped} skipped
            {results.errors.length > 0 ? `, ${results.errors.length} errors` : ''}
          </div>
        </div>
      );
      } catch (parseError) {
        // If standard parsing failed, try manual parsing instead
        console.warn('Standard CSV parsing failed, trying manual method:', parseError);
        
        toast.loading(
          <div className="flex items-center gap-2">
            <span>Standard parsing failed. Trying alternative method...</span>
          </div>,
          { id: toastId }
        );
        
        try {
          // Parse the CSV manually
          const { data, headers } = await manualParseCsv(selectedCsvFile);
          
          // Process in batches of 50
          const batchSize = 50;
          let created = 0, updated = 0, skipped = 0;
          const errors = [];
          
          // Upload in chunks
          for (let i = 0; i < data.length; i += batchSize) {
            const chunk = data.slice(i, i + batchSize);
            const progress = Math.floor((i / data.length) * 100);
            
            setUploadProgress(progress);
            toast.loading(
              <div className="flex items-center gap-2">
                <span>Manual upload: {progress}% complete</span>
              </div>,
              { id: toastId }
            );
            
            try {
              const response = await fetch('/api/schools/upload/chunks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  records: chunk,
                  headers: headers,
                  chunkNumber: Math.floor(i / batchSize) + 1,
                  totalChunks: Math.ceil(data.length / batchSize),
                  isLastChunk: i + batchSize >= data.length
                })
              });
              
              if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
              }
              
              const result = await response.json();
              created += result.created || 0;
              updated += result.updated || 0;
              skipped += result.skipped || 0;
              
              if (result.errors && result.errors.length > 0) {
                errors.push(...result.errors);
              }
            } catch (chunkError: any) {
              console.error('Error uploading chunk:', chunkError);
              errors.push({ message: chunkError.message });
            }
          }
          
          // Refresh the schools list
          const schoolsData = await schoolApi.getSchoolsPaginated({
            page: 1,
            pageSize: pageSize,
          });
          
          setSchools(schoolsData.data);
          setTotalPages(schoolsData.totalPages);
          setTotalCount(schoolsData.totalCount);
          
          // Show appropriate message based on results
          toast.dismiss(toastId);
          
          // If no records were created or updated, but we have errors, show error message
          if (created === 0 && updated === 0 && errors.length > 0) {
            // Group errors by type to show a summary
            const errorTypes: Record<string, number> = {};
            errors.slice(0, 100).forEach(err => {
              const message = err.error || err.message || 'Unknown error';
              errorTypes[message] = (errorTypes[message] || 0) + 1;
            });
            
            // Get the most common error types
            const commonErrors = Object.entries(errorTypes)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            
            // Show error details
            setUploadResults({
              created, updated, skipped,
              errors: errors,
              total: data.length
            });
            
            toast.error(
              <div className="flex flex-col gap-1">
                <div>CSV upload completed with errors</div>
                <div className="text-sm text-muted-foreground">
                  {skipped} rows skipped, {errors.length} errors
                </div>
                <div className="text-xs text-red-600 mt-1">
                  Common errors:
                  <ul className="list-disc pl-4 mt-1">
                    {commonErrors.map(([error, count], i) => (
                      <li key={i}>{error} ({count} occurrences)</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
            
            // Show error dialog with more details
            // You could add a more detailed error dialog here if needed
          } else {
            toast.success(
              <div className="flex flex-col gap-1">
                <div>CSV upload completed successfully (manual method)</div>
                <div className="text-sm text-muted-foreground">
                  {created} created, {updated} updated, {skipped} skipped
                  {errors.length > 0 ? `, ${errors.length} errors` : ''}
                </div>
              </div>
            );
          }
        } catch (manualError: any) {
          console.error('Manual CSV parsing also failed:', manualError);
          toast.dismiss(toastId);
          toast.error(manualError.message || 'Failed to parse CSV file using both methods');
          setUploadProgress(0);
        }
      }
    } catch (error: any) {
      console.error('Error loading CSV:', error);
      setShowPreview(false);
      toast.error(`Failed to load CSV: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle initial file selection
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Only CSV files are allowed');
      return;
    }

    // Store the file and show the preview dialog
    setSelectedCsvFile(file);
    // Start loading preview using the existing showCsvPreview function
    showCsvPreview(file);
  };
  
  const handleUploadConfirmation = (confirmed: boolean) => {
    setShowPreview(false);
    
    if (confirmed && selectedCsvFile) {
      processCsvFile();
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search schools by name, code, PPD, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
          {/* CSV Preview Dialog */}
          <CsvPreviewDialog
            isOpen={showPreview}
            file={selectedCsvFile}
            onClose={() => setShowPreview(false)}
            onConfirm={() => handleUploadConfirmation(true)}
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add School</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New School</DialogTitle>
                <DialogDescription>
                  Enter the details for the new school.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newSchool.name}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, name: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">
                    Code
                  </Label>
                  <Input
                    id="code"
                    value={newSchool.code}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, code: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="level" className="text-right">
                    Level
                  </Label>
                  <Select
                    value={newSchool.level}
                    onValueChange={(value) =>
                      setNewSchool({ ...newSchool, level: value })
                    }
                  >
                    <SelectTrigger id="level" className="col-span-3">
                      <SelectValue placeholder="Select school level" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Select
                    value={newSchool.category}
                    onValueChange={(value) =>
                      setNewSchool({ ...newSchool, category: value })
                    }
                  >
                    <SelectTrigger id="category" className="col-span-3">
                      <SelectValue placeholder="Select school category" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ppd" className="text-right">
                    PPD
                  </Label>
                  <Input
                    id="ppd"
                    value={newSchool.ppd}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, ppd: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={newSchool.address}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, address: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="city" className="text-right">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={newSchool.city}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, city: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="postcode" className="text-right">
                    Postcode
                  </Label>
                  <Input
                    id="postcode"
                    value={newSchool.postcode}
                    onChange={(e) =>
                      setNewSchool({ ...newSchool, postcode: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="state" className="text-right">
                    State
                  </Label>
                  <Select
                    value={newSchool.stateId}
                    onValueChange={(value) =>
                      setNewSchool({ ...newSchool, stateId: value })
                    }
                  >
                    <SelectTrigger id="state" className="col-span-3">
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id.toString()}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddSchool} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters section */}
      {showFilters && (
        <div className="bg-muted/50 p-4 rounded-md mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="level-filter">School Level</Label>
              <Select
                value={filters.level || undefined}
                onValueChange={(value) => handleFilterChange("level", value)}
              >
                <SelectTrigger id="level-filter" className="w-[180px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {schoolLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter">School Category</Label>
              <Select
                value={filters.category || undefined}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger id="category-filter" className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {schoolCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ppd-filter">PPD</Label>
              <Select
                value={filters.ppd || undefined}
                onValueChange={(value) => handleFilterChange("ppd", value)}
              >
                <SelectTrigger id="ppd-filter" className="w-[220px]">
                  <SelectValue placeholder="All PPDs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All PPDs</SelectItem>
                  {uniquePpds.map((ppd) => (
                    <SelectItem key={ppd} value={ppd}>
                      {ppd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state-filter">State</Label>
              <Select
                value={filters.stateId || undefined}
                onValueChange={(value) => handleFilterChange("stateId", value)}
              >
                <SelectTrigger id="state-filter" className="w-[180px]">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading schools...</span>
        </div>
      ) : (
        <>
          {isUploading && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span>Uploading CSV file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {uploadResults && (
            <div className="mb-4">
              <Alert className="mb-2">
                <AlertDescription>
                  <div className="space-y-1">
                    <p>
                      <strong>Upload Results:</strong>
                    </p>
                    <p>Total records: {uploadResults.total}</p>
                    <p>Created: {uploadResults.created}</p>
                    <p>Updated: {uploadResults.updated}</p>
                    <p>Skipped: {uploadResults.skipped}</p>
                  </div>
                </AlertDescription>
              </Alert>

              {uploadResults.errors.length > 0 && (
                <Alert variant="destructive" className="mb-2">
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>
                        <strong>Errors:</strong>
                      </p>
                      <ul className="list-disc pl-5">
                        {uploadResults.errors.map((error, index) => (
                          <li key={index}>
                            Row {error.row}: {error.code} - {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadResults(null)}
              >
                Clear Results
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>PPD</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.length > 0 ? (
                  schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>{school.code}</TableCell>
                      <TableCell>{school.name}</TableCell>
                      <TableCell>{school.level}</TableCell>
                      <TableCell>{school.category}</TableCell>
                      <TableCell>{school.ppd}</TableCell>
                      <TableCell>{school.city}</TableCell>
                      <TableCell>{getStateName(school.stateId)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={isEditDialogOpen && editSchool?.id === school.id}
                          onOpenChange={(open) => {
                            setIsEditDialogOpen(open);
                            if (!open) setEditSchool(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => {
                                setEditSchool(school);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Edit School</DialogTitle>
                              <DialogDescription>
                                Update the school details.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                  Name
                                </Label>
                                <Input
                                  id="edit-name"
                                  value={editSchool?.name || ""}
                                  onChange={(e) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, name: e.target.value }
                                        : null
                                    )
                                  }
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-code" className="text-right">
                                  Code
                                </Label>
                                <Input
                                  id="edit-code"
                                  value={editSchool?.code || ""}
                                  onChange={(e) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, code: e.target.value }
                                        : null
                                    )
                                  }
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-level" className="text-right">
                                  Level
                                </Label>
                                <Select
                                  value={editSchool?.level || ""}
                                  onValueChange={(value) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, level: value }
                                        : null
                                    )
                                  }
                                >
                                  <SelectTrigger id="edit-level" className="col-span-3">
                                    <SelectValue placeholder="Select school level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {schoolLevels.map((level) => (
                                      <SelectItem key={level.value} value={level.value}>
                                        {level.display}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-category" className="text-right">
                                  Category
                                </Label>
                                <Select
                                  value={editSchool?.category || ""}
                                  onValueChange={(value) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, category: value }
                                        : null
                                    )
                                  }
                                >
                                  <SelectTrigger id="edit-category" className="col-span-3">
                                    <SelectValue placeholder="Select school category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {schoolCategories.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-ppd" className="text-right">
                                  PPD
                                </Label>
                                <Input
                                  id="edit-ppd"
                                  value={editSchool?.ppd || ""}
                                  onChange={(e) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, ppd: e.target.value }
                                        : null
                                    )
                                  }
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-address" className="text-right">
                                  Address
                                </Label>
                                <Input
                                  id="edit-address"
                                  value={editSchool?.address || ""}
                                  onChange={(e) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, address: e.target.value }
                                        : null
                                    )
                                  }
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-city" className="text-right">
                                  City
                                </Label>
                                <Input
                                  id="edit-city"
                                  value={editSchool?.city || ""}
                                  onChange={(e) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, city: e.target.value }
                                        : null
                                    )
                                  }
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-postcode" className="text-right">
                                  Postcode
                                </Label>
                                <Input
                                  id="edit-postcode"
                                  value={editSchool?.postcode || ""}
                                  onChange={(e) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, postcode: e.target.value }
                                        : null
                                    )
                                  }
                                  className="col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-state" className="text-right">
                                  State
                                </Label>
                                <Select
                                  value={editSchool?.stateId.toString() || ""}
                                  onValueChange={(value) =>
                                    setEditSchool((prev) =>
                                      prev
                                        ? { ...prev, stateId: parseInt(value) }
                                        : null
                                    )
                                  }
                                >
                                  <SelectTrigger id="edit-state" className="col-span-3">
                                    <SelectValue placeholder="Select a state" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {states.map((state) => (
                                      <SelectItem key={state.id} value={state.id.toString()}>
                                        {state.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleEditSchool} disabled={isSubmitting}>
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save Changes"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={isDeleteDialogOpen && schoolToDelete === school.id}
                          onOpenChange={(open) => {
                            setIsDeleteDialogOpen(open);
                            if (!open) setSchoolToDelete(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSchoolToDelete(school.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              Delete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Deletion</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete the school "
                                {school.name}"? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDeleteSchool}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No schools found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Pagination controls */}
      {!isLoading && totalPages > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Showing {schools.length} of {totalCount} schools
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
