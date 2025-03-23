"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { announcementApi } from "@/lib/api-client";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  MoreVertical, 
  Eye, 
  EyeOff, 
  Link as LinkIcon,
  BellRing
} from "lucide-react";
import { format } from "date-fns";
import { PaginationControl } from "./pagination-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types for announcements
interface Announcement {
  id: number;
  title: string;
  description: string;
  date: string;
  icon: string | null;
  link: string | null;
  linkText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: number;
  createdBy?: {
    id: number;
    name: string | null;
    username: string | null;
  };
}

// Types for pagination
interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Available icons for announcements
const availableIcons = [
  { value: "bell", label: "Bell", icon: <BellRing className="h-4 w-4" /> },
  { value: "calendar", label: "Calendar", icon: <Eye className="h-4 w-4" /> },
  { value: "info", label: "Info", icon: <Eye className="h-4 w-4" /> },
  { value: "warning", label: "Warning", icon: <Eye className="h-4 w-4" /> },
  { value: "success", label: "Success", icon: <Eye className="h-4 w-4" /> },
];

export function AnnouncementManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "",
    link: "",
    linkText: "",
    isActive: true,
  });

  // Load announcements
  const loadAnnouncements = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await announcementApi.getAnnouncementsPaginated({
        page,
        pageSize: 10,
        search: searchQuery,
        activeOnly: showActiveOnly,
      });
      
      setAnnouncements(response.data);
      setPaginationMeta(response.meta);
    } catch (error) {
      console.error("Error loading announcements:", error);
      toast.error("Failed to load announcements. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadAnnouncements();
  }, [searchQuery, showActiveOnly]);

  // Handle page change
  const handlePageChange = (page: number) => {
    loadAnnouncements(page);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAnnouncements(1);
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: "",
      description: "",
      icon: "none",
      link: "",
      linkText: "",
      isActive: true,
    });
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle checkbox change
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetFormData();
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      description: announcement.description,
      icon: announcement.icon || "none",
      link: announcement.link || "",
      linkText: announcement.linkText || "",
      isActive: announcement.isActive,
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDeleteDialogOpen(true);
  };

  // Handle create announcement
  const handleCreateAnnouncement = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Validation Error", {
        description: "Title and description are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert "none" icon value to undefined before sending to API
      const dataToSubmit = {
        ...formData,
        icon: formData.icon === "none" ? undefined : formData.icon,
      };
      
      await announcementApi.createAnnouncement(dataToSubmit);
      toast.success("Announcement created successfully.");
      setIsCreateDialogOpen(false);
      resetFormData();
      loadAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update announcement
  const handleUpdateAnnouncement = async () => {
    if (!selectedAnnouncement) return;
    
    if (!formData.title || !formData.description) {
      toast.error("Validation Error", {
        description: "Title and description are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert "none" icon value to undefined before sending to API
      const dataToSubmit = {
        ...formData,
        icon: formData.icon === "none" ? undefined : formData.icon,
      };
      
      await announcementApi.updateAnnouncement(selectedAnnouncement.id, dataToSubmit);
      toast.success("Announcement updated successfully.");
      setIsEditDialogOpen(false);
      loadAnnouncements();
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Failed to update announcement. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete announcement
  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    setIsSubmitting(true);
    try {
      await announcementApi.deleteAnnouncement(selectedAnnouncement.id);
      toast.success("Announcement deleted successfully.");
      setIsDeleteDialogOpen(false);
      loadAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const toggleActive = async (announcement: Announcement) => {
    try {
      await announcementApi.updateAnnouncement(announcement.id, {
        isActive: !announcement.isActive,
      });
      toast.success(`Announcement ${announcement.isActive ? "deactivated" : "activated"} successfully.`);
      loadAnnouncements();
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update active status. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <Input
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[300px]"
            />
            <Button type="submit" variant="secondary" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="activeOnly"
              checked={showActiveOnly}
              onCheckedChange={(checked) => setShowActiveOnly(!!checked)}
            />
            <Label htmlFor="activeOnly">Active only</Label>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Announcement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No announcements found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            {announcement.icon && (
                              <BellRing className="h-4 w-4 text-primary" />
                            )}
                            <span>{announcement.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={announcement.isActive ? "default" : "secondary"}
                          >
                            {announcement.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(announcement.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {announcement.link ? (
                            <div className="flex items-center space-x-1">
                              <LinkIcon className="h-3 w-3" />
                              <span>{announcement.linkText || "Link"}</span>
                            </div>
                          ) : (
                            "None"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActive(announcement)}
                              className={`h-8 w-8 p-0 ${announcement.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
                              title={announcement.isActive ? "Deactivate" : "Activate"}
                            >
                              {announcement.isActive ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                              <span className="sr-only">{announcement.isActive ? "Deactivate" : "Activate"}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(announcement)}
                              className="h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(announcement)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(announcement)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleActive(announcement)}>
                                  {announcement.isActive ? (
                                    <>
                                      <EyeOff className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(announcement)}
                                  className="text-red-600"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {paginationMeta.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <PaginationControl
                    currentPage={paginationMeta.page}
                    totalPages={paginationMeta.totalPages}
                    onPageChange={(page) => {
                      handlePageChange(page);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Announcement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Add a new announcement to the Techlympics 2025 website.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Announcement description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => handleSelectChange("icon", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center">
                        {icon.icon}
                        <span className="ml-2">{icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link">Link URL (Optional)</Label>
                <Input
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkText">Link Text (Optional)</Label>
                <Input
                  id="linkText"
                  name="linkText"
                  value={formData.linkText}
                  onChange={handleInputChange}
                  placeholder="Learn More"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleCheckboxChange("isActive", !!checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAnnouncement} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update the announcement details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Announcement description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-icon">Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => handleSelectChange("icon", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center">
                        {icon.icon}
                        <span className="ml-2">{icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-link">Link URL (Optional)</Label>
                <Input
                  id="edit-link"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-linkText">Link Text (Optional)</Label>
                <Input
                  id="edit-linkText"
                  name="linkText"
                  value={formData.linkText}
                  onChange={handleInputChange}
                  placeholder="Learn More"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleCheckboxChange("isActive", !!checked)}
              />
              <Label htmlFor="edit-isActive">Active</Label>
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
            <Button onClick={handleUpdateAnnouncement} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the announcement &quot;
              {selectedAnnouncement?.title}&quot;? This action cannot be undone.
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
              onClick={handleDeleteAnnouncement}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
