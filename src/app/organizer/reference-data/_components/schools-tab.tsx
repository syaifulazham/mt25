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
import { Loader2, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

const schoolLevels = ["Primary", "Secondary"];
const schoolCategories = ["Public", "Private", "International"];

export function SchoolsTab() {
  const [schools, setSchools] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // CSV upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; code: string; error: string }[];
  } | null>(null);

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

  // Handle file upload with improved error handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size and type
    if (!file.name.endsWith('.csv')) {
      toast.error('Only CSV files are allowed');
      return;
    }
    
    // Limit file size to 2MB to prevent issues in production
    const maxSizeMB = 2;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      toast.error(`File size exceeds ${maxSizeMB}MB limit. Please reduce the file size or split into smaller files.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);
      
      // Add a timestamp to prevent caching
      formData.append("timestamp", Date.now().toString());

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);

      // Use fetch directly with better error handling instead of the API client
      const response = await fetch('/api/schools/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type - browser will set it with proper boundary
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearInterval(progressInterval);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Handle HTML response (common cause of "Unexpected token '<'")
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. The file may be too large or the server timed out.`);
      }
      
      const results = await response.json();
      
      if (!response.ok) {
        throw new Error(results.error || `Upload failed with status ${response.status}`);
      }

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

      toast.success(`CSV upload completed: ${results.created} created, ${results.updated} updated`);
    } catch (error: any) {
      console.error("Error uploading CSV:", error);
      toast.error(error.message || "Failed to upload CSV file");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
                        <SelectItem key={level} value={level}>
                          {level}
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
                    <SelectItem key={level} value={level}>
                      {level}
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
                                      <SelectItem key={level} value={level}>
                                        {level}
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
