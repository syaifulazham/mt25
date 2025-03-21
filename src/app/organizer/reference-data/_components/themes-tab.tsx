"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Loader2, Upload, PlusIcon, Pencil, Trash2, Search as SearchIcon } from "lucide-react";
// @ts-ignore
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
import { themeApi } from "@/lib/api-client";
import Image from "next/image";
import { X, ImageIcon } from "lucide-react";

// Theme type definition
type Theme = {
  id: number;
  name: string;
  color: string | null;
  logoPath: string | null;
  description: string | null;
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

interface ThemeFormData {
  id?: number | string;
  name: string;
  color?: string;
  logoPath?: string;
  description?: string;
  _count?: {
    contests: number;
  };
}

export function ThemesTab() {
  // State for themes and pagination
  const [themes, setThemes] = useState<ThemeFormData[]>([]);
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
  
  // State for new theme form
  const [newTheme, setNewTheme] = useState<ThemeFormData>({
    name: "",
    color: "#3B82F6", // Default blue color
    logoPath: "",
    description: ""
  });
  
  // State for edit theme form
  const [editTheme, setEditTheme] = useState<ThemeFormData | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<number | null>(null);
  
  // State for image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to load themes with pagination
  const loadThemes = useCallback(async (page = 1, search = searchTerm) => {
    setIsLoading(true);
    try {
      const response = await themeApi.getThemesPaginated({
        page,
        pageSize: paginationMeta.pageSize,
        search
      });
      
      setThemes(response.data);
      setPaginationMeta(response.meta);
    } catch (error) {
      console.error("Error loading themes:", error);
      toast.error("Failed to load themes");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, paginationMeta.pageSize]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      loadThemes(1, value);
    }, 300),
    [loadThemes]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Load themes on initial render
  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  // Handle page change
  const handlePageChange = (page: number) => {
    loadThemes(page);
  };

  // Reset new theme form
  const resetNewThemeForm = () => {
    setNewTheme({
      name: "",
      color: "#3B82F6",
      logoPath: "",
      description: ""
    });
  };

  // Handle add theme
  const handleAddTheme = async () => {
    if (!newTheme.name.trim()) {
      toast.error("Theme name is required");
      return;
    }

    setIsLoading(true);
    try {
      // Upload image if selected
      let logoPath = newTheme.logoPath;
      if (imageFile) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          logoPath = uploadedPath;
        }
      }
      
      await themeApi.createTheme({
        ...newTheme,
        logoPath,
      });
      
      toast.success("Theme added successfully");
      setIsAddDialogOpen(false);
      resetNewThemeForm();
      setImageFile(null);
      setImagePreview(null);
      loadThemes();
    } catch (error) {
      console.error("Error adding theme:", error);
      toast.error("Failed to add theme");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit theme submission
  const handleEditTheme = async () => {
    if (!editTheme || !editTheme.name.trim()) {
      toast.error("Theme name is required");
      return;
    }

    if (!editTheme.id) {
      toast.error("Theme ID is missing");
      return;
    }

    // Ensure id is a number
    const themeId = Number(editTheme.id);
    if (isNaN(themeId)) {
      toast.error("Invalid theme ID");
      return;
    }
    
    setIsLoading(true);
    try {
      // Upload image if selected
      let logoPath = editTheme.logoPath;
      if (imageFile) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          logoPath = uploadedPath;
        }
      }
      
      await themeApi.updateTheme(themeId, {
        name: editTheme.name,
        color: editTheme.color,
        logoPath: logoPath,
        description: editTheme.description
      });
      
      toast.success("Theme updated successfully");
      setIsEditDialogOpen(false);
      setImageFile(null);
      setImagePreview(null);
      loadThemes();
    } catch (error) {
      console.error("Error updating theme:", error);
      toast.error("Failed to update theme");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete theme
  const handleDeleteTheme = async () => {
    if (!themeToDelete) {
      toast.error("Theme ID is missing");
      return;
    }

    // Ensure id is a number or string
    const themeId = themeToDelete;
    
    setIsLoading(true);
    try {
      await themeApi.deleteTheme(themeId);
      toast.success("Theme deleted successfully");
      setIsDeleteDialogOpen(false);
      setThemeToDelete(null);
      loadThemes();
    } catch (error) {
      console.error("Error deleting theme:", error);
      toast.error("Failed to delete theme");
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit dialog with theme data
  const openEditDialog = (theme: ThemeFormData) => {
    setEditTheme({
      ...theme,
      id: theme.id as number
    });
    setImagePreview(theme.logoPath ? theme.logoPath : null);
    setIsEditDialogOpen(true);
  };

  // Open delete dialog with theme id
  const openDeleteDialog = (themeId: number) => {
    setThemeToDelete(themeId);
    setIsDeleteDialogOpen(true);
  };

  // Handle form input change for new theme
  const handleNewThemeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTheme(prev => ({ ...prev, [name]: value }));
  };

  // Handle form input change for edit theme
  const handleEditThemeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editTheme) return;
    
    const { name, value } = e.target;
    setEditTheme(prev => prev ? { ...prev, [name]: value } : null);
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and SVG are allowed.");
      return;
    }

    // Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File is too large. Maximum size is 2MB.");
      return;
    }

    setImageFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clear image selection
  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload image
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }
      
      const data = await response.json();
      return data.filePath;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="relative w-full sm:w-96">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            className="pl-8"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Theme
        </Button>
      </div>

      {/* Themes table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Contests</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : themes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No themes found.
                </TableCell>
              </TableRow>
            ) : (
              themes.map((theme) => (
                <TableRow key={theme.id}>
                  <TableCell className="font-medium">{theme.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: theme.color || '#cccccc' }}
                      />
                      {theme.color || 'Not set'}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {theme.description || 'No description'}
                  </TableCell>
                  <TableCell className="text-right">{theme._count?.contests || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(theme)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(theme.id as number)}
                        disabled={theme._count?.contests ? theme._count.contests > 0 : false}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && themes.length > 0 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(paginationMeta.currentPage - 1)}
                className={!paginationMeta.hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {Array.from({ length: paginationMeta.totalPages }).map((_, i) => {
              const page = i + 1;
              
              // Show first page, last page, current page, and pages around current
              if (
                page === 1 || 
                page === paginationMeta.totalPages ||
                (page >= paginationMeta.currentPage - 1 && page <= paginationMeta.currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === paginationMeta.currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              
              // Show ellipsis for gaps
              if (
                page === paginationMeta.currentPage - 2 ||
                page === paginationMeta.currentPage + 2
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              
              return null;
            })}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => handlePageChange(paginationMeta.currentPage + 1)}
                className={!paginationMeta.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Add Theme Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Theme</DialogTitle>
            <DialogDescription>
              Create a new competition theme.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Theme Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter theme name"
                value={newTheme.name}
                onChange={handleNewThemeChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  name="color"
                  type="color"
                  className="w-16 p-1 h-10"
                  value={newTheme.color || "#3B82F6"}
                  onChange={handleNewThemeChange}
                />
                <Input
                  name="color"
                  placeholder="Color hex code"
                  value={newTheme.color || ""}
                  onChange={handleNewThemeChange}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logoUpload">Logo Image</Label>
              <div className="flex flex-col gap-3">
                {imagePreview ? (
                  <div className="relative w-full h-40 border rounded-md overflow-hidden">
                    <Image 
                      src={imagePreview} 
                      alt="Logo preview" 
                      fill 
                      className="object-contain"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearImageSelection}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-6 bg-muted/50">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Drag and drop or click to upload</p>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex items-center gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Select Image
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  id="logoUpload"
                  accept="image/jpeg,image/png,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPEG, PNG, GIF, SVG. Max size: 2MB.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter theme description"
                value={newTheme.description || ""}
                onChange={handleNewThemeChange}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              setNewTheme({ name: "" });
              clearImageSelection();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddTheme} disabled={isLoading || isUploading}>
              {isLoading || isUploading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Theme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Theme</DialogTitle>
            <DialogDescription>
              Update theme details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Theme Name</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="Enter theme name"
                value={editTheme?.name || ""}
                onChange={handleEditThemeChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  name="color"
                  type="color"
                  className="w-16 p-1 h-10"
                  value={editTheme?.color || "#3B82F6"}
                  onChange={handleEditThemeChange}
                />
                <Input
                  name="color"
                  placeholder="Color hex code"
                  value={editTheme?.color || ""}
                  onChange={handleEditThemeChange}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editLogoUpload">Logo Image</Label>
              <div className="flex flex-col gap-3">
                {imagePreview ? (
                  <div className="relative w-full h-40 border rounded-md overflow-hidden">
                    <Image 
                      src={imagePreview} 
                      alt="Logo preview" 
                      fill 
                      className="object-contain"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearImageSelection}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-6 bg-muted/50">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Drag and drop or click to upload</p>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex items-center gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Select Image
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  id="editLogoUpload"
                  accept="image/jpeg,image/png,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPEG, PNG, GIF, SVG. Max size: 2MB.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                placeholder="Enter theme description"
                value={editTheme?.description || ""}
                onChange={handleEditThemeChange}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditTheme({ name: "" });
              clearImageSelection();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditTheme} disabled={isLoading || isUploading}>
              {isLoading || isUploading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Theme Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this theme? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTheme}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
