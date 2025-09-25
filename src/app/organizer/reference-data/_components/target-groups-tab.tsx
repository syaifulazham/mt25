"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
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
import { targetGroupApi } from "@/lib/api-client";
import { Loader2, Upload } from "lucide-react";
import debounce from "lodash.debounce";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// School levels for dropdown
const schoolLevels = ["Primary", "Secondary", "Pre-University", "Higher Education"];

// Class grade options
const classGradeOptions = ["1", "2", "3", "4", "5", "6", "PPKI"];

// Target group type definition
type TargetGroup = {
  id: number;
  code: string;
  name: string;
  ageGroup: string;
  minAge: number;
  maxAge: number;
  schoolLevel: string;
  contestant_class_grade?: string | null;
  class_grade_array?: string[] | null;
  _count?: {
    contests: number;
  };
};

// Pagination metadata type
type PaginationMeta = {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function TargetGroupsTab() {
  // State for target groups and pagination
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  
  // State for search and loading
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // State for new target group form
  const [newTargetGroup, setNewTargetGroup] = useState({
    name: "",
    code: "",
    ageGroup: "",
    minAge: 0,
    maxAge: 0,
    schoolLevel: "",
    contestant_class_grade: null,
    class_grade_array: [] as string[]
  });
  
  // State for edit target group form
  const [editTargetGroup, setEditTargetGroup] = useState<TargetGroup | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [targetGroupToDelete, setTargetGroupToDelete] = useState<number | null>(null);
  
  // CSV upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);

  // Function to load target groups with pagination
  const loadTargetGroups = useCallback(async (page = 1, search = searchTerm) => {
    setIsLoading(true);
    try {
      const response = await targetGroupApi.getTargetGroupsPaginated({
        page,
        pageSize: 10,
        search,
      });
      setTargetGroups(response.data);
      setPaginationMeta(response.meta);
    } catch (error) {
      console.error("Error loading target groups:", error);
      toast.error("Failed to load target groups");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  // Load target groups on initial render
  useEffect(() => {
    loadTargetGroups();
  }, [loadTargetGroups]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((search: string) => {
      loadTargetGroups(1, search);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    loadTargetGroups(page);
  };

  // Handle add target group
  const handleAddTargetGroup = async () => {
    if (!newTargetGroup.name.trim() || !newTargetGroup.code.trim() || !newTargetGroup.ageGroup.trim()) {
      toast.error("Name, code, and age group are required");
      return;
    }

    if (!newTargetGroup.schoolLevel) {
      toast.error("Please select a school level");
      return;
    }

    try {
      await targetGroupApi.createTargetGroup({
        ...newTargetGroup,
        minAge: Number(newTargetGroup.minAge),
        maxAge: Number(newTargetGroup.maxAge),
        class_grade_array: newTargetGroup.class_grade_array.length > 0 ? newTargetGroup.class_grade_array : null,
      });
      
      setNewTargetGroup({
        name: "",
        code: "",
        ageGroup: "",
        minAge: 0,
        maxAge: 0,
        schoolLevel: "",
        contestant_class_grade: null,
        class_grade_array: []
      });
      
      setIsAddDialogOpen(false);
      toast.success("Target group added successfully");
      loadTargetGroups();
    } catch (error: any) {
      console.error("Error adding target group:", error);
      toast.error(error.message || "Failed to add target group");
    }
  };

  // Handle edit target group
  const handleEditTargetGroup = async () => {
    if (!editTargetGroup) return;
    
    if (!editTargetGroup.name.trim() || !editTargetGroup.code.trim() || !editTargetGroup.ageGroup.trim()) {
      toast.error("Name, code, and age group are required");
      return;
    }

    if (!editTargetGroup.schoolLevel) {
      toast.error("Please select a school level");
      return;
    }

    try {
      await targetGroupApi.updateTargetGroup(editTargetGroup.id, {
        ...editTargetGroup,
        minAge: Number(editTargetGroup.minAge),
        maxAge: Number(editTargetGroup.maxAge),
        class_grade_array: editTargetGroup.class_grade_array && editTargetGroup.class_grade_array.length > 0 
          ? editTargetGroup.class_grade_array 
          : null,
      });
      
      setIsEditDialogOpen(false);
      toast.success("Target group updated successfully");
      loadTargetGroups(paginationMeta.currentPage);
    } catch (error: any) {
      console.error("Error updating target group:", error);
      toast.error(error.message || "Failed to update target group");
    }
  };

  // Handle delete target group
  const handleDeleteTargetGroup = async () => {
    if (targetGroupToDelete === null) return;
    
    try {
      await targetGroupApi.deleteTargetGroup(targetGroupToDelete);
      setIsDeleteDialogOpen(false);
      toast.success("Target group deleted successfully");
      
      // If we're on the last page and it's now empty, go to previous page
      if (
        targetGroups.length === 1 && 
        paginationMeta.currentPage > 1 && 
        paginationMeta.currentPage === paginationMeta.totalPages
      ) {
        loadTargetGroups(paginationMeta.currentPage - 1);
      } else {
        loadTargetGroups(paginationMeta.currentPage);
      }
    } catch (error: any) {
      console.error("Error deleting target group:", error);
      toast.error(error.message || "Failed to delete target group");
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    
    if (!file.name.endsWith(".csv")) {
      toast.error("Only CSV files are allowed");
      return;
    }
    
    setIsUploading(true);
    setUploadResults(null);
    
    try {
      const results = await targetGroupApi.uploadTargetGroupsCsv(formData);
      setUploadResults(results);
      toast.success(`CSV processed: ${results.created} created, ${results.updated} updated`);
      loadTargetGroups();
    } catch (error: any) {
      console.error("Error uploading CSV:", error);
      toast.error(error.message || "Failed to upload CSV");
    } finally {
      setIsUploading(false);
    }
  };

  // Render pagination controls
  const renderPagination = () => {
    const { currentPage, totalPages } = paginationMeta;
    
    if (totalPages <= 1) return null;
    
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(currentPage - 1)}
              className={!paginationMeta.hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => 
              page === 1 || 
              page === totalPages || 
              (page >= currentPage - 1 && page <= currentPage + 1)
            )
            .map((page, index, array) => {
              // Add ellipsis if there are gaps
              if (index > 0 && page - array[index - 1] > 1) {
                return (
                  <Fragment key={`ellipsis-${page}`}>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={page === currentPage}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </Fragment>
                );
              }
              
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(currentPage + 1)}
              className={!paginationMeta.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search target groups..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-[300px]"
          />
        </div>
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Target Groups CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with target groups data. The CSV should have the following headers:
                  code, name, ageGroup, minAge (optional), maxAge (optional), schoolLevel.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCsvUpload}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="file">CSV File</Label>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      accept=".csv"
                      disabled={isUploading}
                    />
                  </div>
                  
                  {uploadResults && (
                    <div className="text-sm">
                      <p>Total rows: {uploadResults.total}</p>
                      <p>Created: {uploadResults.created}</p>
                      <p>Updated: {uploadResults.updated}</p>
                      <p>Skipped/Errors: {uploadResults.skipped}</p>
                      {uploadResults.errors && uploadResults.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Errors:</p>
                          <ul className="max-h-[100px] overflow-y-auto text-xs">
                            {uploadResults.errors.slice(0, 5).map((error: any, i: number) => (
                              <li key={i}>
                                Row {error.row}: {error.error} (Code: {error.code})
                              </li>
                            ))}
                            {uploadResults.errors.length > 5 && (
                              <li>...and {uploadResults.errors.length - 5} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Target Group</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Target Group</DialogTitle>
                <DialogDescription>
                  Enter the details for the new target group.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newTargetGroup.name}
                    onChange={(e) => setNewTargetGroup({...newTargetGroup, name: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Primary School (Lower)"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">
                    Code
                  </Label>
                  <Input
                    id="code"
                    value={newTargetGroup.code}
                    onChange={(e) => setNewTargetGroup({...newTargetGroup, code: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., PRIMARY-LOWER"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ageGroup" className="text-right">
                    Age Group
                  </Label>
                  <Input
                    id="ageGroup"
                    value={newTargetGroup.ageGroup}
                    onChange={(e) => setNewTargetGroup({...newTargetGroup, ageGroup: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., 7-9"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="minAge" className="text-right">
                    Min Age
                  </Label>
                  <Input
                    id="minAge"
                    type="number"
                    min="0"
                    value={newTargetGroup.minAge}
                    onChange={(e) => setNewTargetGroup({...newTargetGroup, minAge: parseInt(e.target.value) || 0})}
                    className="col-span-3"
                    placeholder="e.g., 7"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxAge" className="text-right">
                    Max Age
                  </Label>
                  <Input
                    id="maxAge"
                    type="number"
                    min="0"
                    value={newTargetGroup.maxAge}
                    onChange={(e) => setNewTargetGroup({...newTargetGroup, maxAge: parseInt(e.target.value) || 0})}
                    className="col-span-3"
                    placeholder="e.g., 9"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="schoolLevel" className="text-right">
                    School Level
                  </Label>
                  <Select 
                    value={newTargetGroup.schoolLevel} 
                    onValueChange={(value) => setNewTargetGroup({...newTargetGroup, schoolLevel: value})}
                  >
                    <SelectTrigger id="schoolLevel" className="col-span-3">
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
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="class_grade_array" className="text-right mt-2">
                    Class Grades
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {classGradeOptions.map((grade) => (
                        <div key={grade} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`grade-${grade}`}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={newTargetGroup.class_grade_array.includes(grade)}
                            onChange={(e) => {
                              const updatedGrades = e.target.checked
                                ? [...newTargetGroup.class_grade_array, grade]
                                : newTargetGroup.class_grade_array.filter(g => g !== grade);
                              setNewTargetGroup({...newTargetGroup, class_grade_array: updatedGrades});
                            }}
                          />
                          <label htmlFor={`grade-${grade}`} className="text-sm font-medium">
                            {grade}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select multiple class grades that apply to this target group
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTargetGroup}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age Group</TableHead>
              <TableHead>Min/Max Age</TableHead>
              <TableHead>School Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : targetGroups.length > 0 ? (
              targetGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.code}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.ageGroup}</TableCell>
                  <TableCell>
                    {group.minAge || 0}/{group.maxAge || 0}
                    {group.minAge === 0 && group.maxAge === 0 && " (No limit)"}
                  </TableCell>
                  <TableCell>{group.schoolLevel}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={isEditDialogOpen && editTargetGroup?.id === group.id} onOpenChange={(open) => {
                      setIsEditDialogOpen(open);
                      if (!open) setEditTargetGroup(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => {
                            setEditTargetGroup(group);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Edit Target Group</DialogTitle>
                          <DialogDescription>
                            Update the target group details.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">
                              Name
                            </Label>
                            <Input
                              id="edit-name"
                              value={editTargetGroup?.name || ""}
                              onChange={(e) => setEditTargetGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-code" className="text-right">
                              Code
                            </Label>
                            <Input
                              id="edit-code"
                              value={editTargetGroup?.code || ""}
                              onChange={(e) => setEditTargetGroup(prev => prev ? { ...prev, code: e.target.value } : null)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-ageGroup" className="text-right">
                              Age Group
                            </Label>
                            <Input
                              id="edit-ageGroup"
                              value={editTargetGroup?.ageGroup || ""}
                              onChange={(e) => setEditTargetGroup(prev => prev ? { ...prev, ageGroup: e.target.value } : null)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-minAge" className="text-right">
                              Min Age
                            </Label>
                            <Input
                              id="edit-minAge"
                              type="number"
                              min="0"
                              value={editTargetGroup?.minAge || 0}
                              onChange={(e) => setEditTargetGroup(prev => prev ? { ...prev, minAge: parseInt(e.target.value) || 0 } : null)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-maxAge" className="text-right">
                              Max Age
                            </Label>
                            <Input
                              id="edit-maxAge"
                              type="number"
                              min="0"
                              value={editTargetGroup?.maxAge || 0}
                              onChange={(e) => setEditTargetGroup(prev => prev ? { ...prev, maxAge: parseInt(e.target.value) || 0 } : null)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-schoolLevel" className="text-right">
                              School Level
                            </Label>
                            <Select 
                              value={editTargetGroup?.schoolLevel || ""} 
                              onValueChange={(value) => setEditTargetGroup(prev => prev ? { ...prev, schoolLevel: value } : null)}
                            >
                              <SelectTrigger id="edit-schoolLevel" className="col-span-3">
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
                          <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-class_grade_array" className="text-right mt-2">
                              Class Grades
                            </Label>
                            <div className="col-span-3 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {classGradeOptions.map((grade) => (
                                  <div key={grade} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`edit-grade-${grade}`}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                      checked={editTargetGroup?.class_grade_array?.includes(grade) || false}
                                      onChange={(e) => {
                                        if (!editTargetGroup) return;
                                        const currentGrades = editTargetGroup.class_grade_array || [];
                                        const updatedGrades = e.target.checked
                                          ? [...currentGrades, grade]
                                          : currentGrades.filter(g => g !== grade);
                                        setEditTargetGroup({ ...editTargetGroup, class_grade_array: updatedGrades });
                                      }}
                                    />
                                    <label htmlFor={`edit-grade-${grade}`} className="text-sm font-medium">
                                      {grade}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Select multiple class grades that apply to this target group
                              </p>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleEditTargetGroup}>Save Changes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={isDeleteDialogOpen && targetGroupToDelete === group.id} onOpenChange={(open) => {
                      setIsDeleteDialogOpen(open);
                      if (!open) setTargetGroupToDelete(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setTargetGroupToDelete(group.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={group._count?.contests ? group._count.contests > 0 : false}
                          title={group._count?.contests && group._count.contests > 0 ? "Cannot delete target group with related contests" : ""}
                        >
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Deletion</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete the target group "{group.name}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeleteTargetGroup}>
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No target groups found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {renderPagination()}
    </div>
  );
}
