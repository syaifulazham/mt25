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
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { higherInstitutionApi } from "@/lib/api-client";
import { stateApi } from "@/lib/api-client";

export function HigherInstitutionsTab() {
  // State for institutions data
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Filter state
  const [filters, setFilters] = useState({
    stateId: null as string | null,
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Form state
  const [newInstitution, setNewInstitution] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    postcode: "",
    stateId: "",
  });
  const [editInstitution, setEditInstitution] = useState<{
    id: number;
    name: string;
    code: string;
    address: string;
    city: string;
    postcode: string;
    stateId: number;
  } | null>(null);
  
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // CSV upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<any>(null);

  // Fetch institutions and states
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch states (no pagination needed)
        const statesData = await stateApi.getStates();
        setStates(statesData);

        // Fetch institutions with pagination
        const params: any = {
          page: currentPage,
          pageSize: pageSize,
        };

        if (searchTerm) {
          params.search = searchTerm;
        }

        // Add filters if they are set and not null or "all"
        if (filters.stateId && filters.stateId !== "all") params.stateId = filters.stateId;

        const institutionsResponse = await higherInstitutionApi.getHigherInstitutionsPaginated(params);
        setInstitutions(institutionsResponse.data);
        setTotalPages(institutionsResponse.pagination.totalPages);
        setTotalCount(institutionsResponse.pagination.totalCount);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, pageSize, searchTerm, filters]);

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on new search
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get state name from state ID
  const getStateName = (stateId: number) => {
    const state = states.find(s => s.id === stateId);
    return state ? state.name : "Unknown";
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page when changing filters
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      stateId: null,
    });
    setCurrentPage(1);
  };

  // Handle form submission for adding a new institution
  const handleAddInstitution = async () => {
    if (!newInstitution.name.trim() || !newInstitution.code.trim() || !newInstitution.stateId) {
      toast.error("Name, code, and state are required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await higherInstitutionApi.createHigherInstitution({
        ...newInstitution,
        stateId: parseInt(newInstitution.stateId),
      });
      
      // Reset form and close dialog
      setNewInstitution({
        name: "",
        code: "",
        address: "",
        city: "",
        postcode: "",
        stateId: "",
      });
      setIsAddDialogOpen(false);
      
      // Refresh data
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (filters.stateId) params.stateId = filters.stateId;
      
      const response = await higherInstitutionApi.getHigherInstitutionsPaginated(params);
      setInstitutions(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);
      
      toast.success("Higher institution added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add higher institution");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission for editing an institution
  const handleEditInstitution = async () => {
    if (!editInstitution || !editInstitution.name.trim() || !editInstitution.code.trim()) {
      toast.error("Name and code are required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await higherInstitutionApi.updateHigherInstitution(
        editInstitution.id.toString(),
        editInstitution
      );
      
      // Close dialog
      setIsEditDialogOpen(false);
      setEditInstitution(null);
      
      // Refresh data
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (filters.stateId) params.stateId = filters.stateId;
      
      const response = await higherInstitutionApi.getHigherInstitutionsPaginated(params);
      setInstitutions(response.data);
      
      toast.success("Higher institution updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update higher institution");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting an institution
  const handleDeleteInstitution = async () => {
    if (institutionToDelete === null) return;

    setIsSubmitting(true);
    try {
      await higherInstitutionApi.deleteHigherInstitution(institutionToDelete.toString());
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      setInstitutionToDelete(null);
      
      // Refresh data
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (filters.stateId) params.stateId = filters.stateId;
      
      const response = await higherInstitutionApi.getHigherInstitutionsPaginated(params);
      setInstitutions(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);
      
      // If we deleted the last item on the page, go to the previous page
      if (institutions.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      
      toast.success("Higher institution deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete higher institution");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      const result = await higherInstitutionApi.uploadHigherInstitutionsCsv(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResults(result);
      
      // Refresh data after successful upload
      const params: any = { page: 1, pageSize };
      if (searchTerm) params.search = searchTerm;
      if (filters.stateId) params.stateId = filters.stateId;
      
      const response = await higherInstitutionApi.getHigherInstitutionsPaginated(params);
      setInstitutions(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);
      setCurrentPage(1);
      
      toast.success(`CSV upload completed: ${result.success} records imported`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload CSV file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-64">
            <Input
              placeholder="Search institutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
              <Select
                value={filters.stateId || "all"}
                onValueChange={(value) => handleFilterChange("stateId", value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="State" />
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
              
              <Button 
                variant="ghost" 
                onClick={clearFilters}
                className="h-10"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Institution</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Higher Institution</DialogTitle>
                <DialogDescription>
                  Enter the details of the new higher institution.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newInstitution.name}
                    onChange={(e) => setNewInstitution({ ...newInstitution, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">
                    Code
                  </Label>
                  <Input
                    id="code"
                    value={newInstitution.code}
                    onChange={(e) => setNewInstitution({ ...newInstitution, code: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={newInstitution.address}
                    onChange={(e) => setNewInstitution({ ...newInstitution, address: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="city" className="text-right">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={newInstitution.city}
                    onChange={(e) => setNewInstitution({ ...newInstitution, city: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="postcode" className="text-right">
                    Postcode
                  </Label>
                  <Input
                    id="postcode"
                    value={newInstitution.postcode}
                    onChange={(e) => setNewInstitution({ ...newInstitution, postcode: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="state" className="text-right">
                    State
                  </Label>
                  <Select
                    value={newInstitution.stateId}
                    onValueChange={(value) => setNewInstitution({ ...newInstitution, stateId: value })}
                  >
                    <SelectTrigger className="col-span-3">
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
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddInstitution} disabled={isSubmitting}>
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
          
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload CSV"
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {isUploading && (
        <div className="space-y-2 my-4">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Uploading and processing CSV file... {uploadProgress}%
          </p>
        </div>
      )}
      
      {uploadResults && (
        <Alert className="my-4">
          <AlertDescription>
            CSV upload completed: {uploadResults.success} records imported.
            {uploadResults.errors && uploadResults.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">Errors:</p>
                <ul className="list-disc pl-5">
                  {uploadResults.errors.slice(0, 5).map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                  {uploadResults.errors.length > 5 && (
                    <li>...and {uploadResults.errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.length > 0 ? (
                  institutions.map((institution) => (
                    <TableRow key={institution.id}>
                      <TableCell>{institution.code}</TableCell>
                      <TableCell>{institution.name}</TableCell>
                      <TableCell>{getStateName(institution.stateId)}</TableCell>
                      <TableCell>{institution.city || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Dialog open={isEditDialogOpen && editInstitution?.id === institution.id} onOpenChange={(open) => {
                          if (!open) setEditInstitution(null);
                          setIsEditDialogOpen(open);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              onClick={() => setEditInstitution({
                                id: institution.id,
                                name: institution.name,
                                code: institution.code,
                                address: institution.address || "",
                                city: institution.city || "",
                                postcode: institution.postcode || "",
                                stateId: institution.stateId,
                              })}
                            >
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Higher Institution</DialogTitle>
                              <DialogDescription>
                                Update the details of the higher institution.
                              </DialogDescription>
                            </DialogHeader>
                            {editInstitution && (
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-name" className="text-right">
                                    Name
                                  </Label>
                                  <Input
                                    id="edit-name"
                                    value={editInstitution.name}
                                    onChange={(e) => setEditInstitution({ ...editInstitution, name: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-code" className="text-right">
                                    Code
                                  </Label>
                                  <Input
                                    id="edit-code"
                                    value={editInstitution.code}
                                    onChange={(e) => setEditInstitution({ ...editInstitution, code: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-address" className="text-right">
                                    Address
                                  </Label>
                                  <Input
                                    id="edit-address"
                                    value={editInstitution.address}
                                    onChange={(e) => setEditInstitution({ ...editInstitution, address: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-city" className="text-right">
                                    City
                                  </Label>
                                  <Input
                                    id="edit-city"
                                    value={editInstitution.city}
                                    onChange={(e) => setEditInstitution({ ...editInstitution, city: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-postcode" className="text-right">
                                    Postcode
                                  </Label>
                                  <Input
                                    id="edit-postcode"
                                    value={editInstitution.postcode}
                                    onChange={(e) => setEditInstitution({ ...editInstitution, postcode: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-state" className="text-right">
                                    State
                                  </Label>
                                  <Select
                                    value={editInstitution.stateId.toString()}
                                    onValueChange={(value) => setEditInstitution({ ...editInstitution, stateId: parseInt(value) })}
                                  >
                                    <SelectTrigger className="col-span-3">
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
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleEditInstitution} disabled={isSubmitting}>
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
                        <Dialog open={isDeleteDialogOpen && institutionToDelete === institution.id} onOpenChange={(open) => {
                          if (!open) setInstitutionToDelete(null);
                          setIsDeleteDialogOpen(open);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setInstitutionToDelete(institution.id)}
                            >
                              Delete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Higher Institution</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this higher institution? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteInstitution} disabled={isSubmitting}>
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      No higher institutions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {institutions.length} of {totalCount} higher institutions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
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
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder={pageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
