"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
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
import { newsApi } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload-service";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  MoreVertical, 
  Eye, 
  Calendar, 
  Clock, 
  Star, 
  StarOff,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { PaginationControl } from "./pagination-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "@/components/ui/editor";
import { RichEditor } from "@/components/ui/rich-editor";

// Types for news items
interface NewsItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  date: string;
  readTime: string | null;
  author: string | null;
  featured: boolean;
  isPublished: boolean;
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

export function NewsManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    readTime: "",
    author: "",
    featured: false,
    isPublished: false,
  });

  const [coverImageUploadProgress, setCoverImageUploadProgress] = useState(0);
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const coverImageFileInputRef = useRef<HTMLInputElement>(null);

  // Load news items
  const loadNewsItems = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await newsApi.getNewsPaginated({
        page,
        pageSize: 10,
        search: searchQuery,
        publishedOnly: showPublishedOnly,
      });
      
      setNewsItems(response.data);
      setPaginationMeta(response.meta);
    } catch (error) {
      console.error("Error loading news:", error);
      toast.error("Failed to load news items. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNewsItems();
  }, [searchQuery, showPublishedOnly]);

  // Handle page change
  const handlePageChange = (page: number) => {
    loadNewsItems(page);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadNewsItems(1);
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImage: "",
      readTime: "",
      author: "",
      featured: false,
      isPublished: false,
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

  // Handle content change from rich text editor
  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({ 
      ...prev, 
      title,
      slug: title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    }));
  };

  // Handle cover image upload
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCoverImage(true);
      setCoverImageUploadProgress(10);
      
      // Simulate progress (in a real app, you'd use an upload progress event)
      const progressInterval = setInterval(() => {
        setCoverImageUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const imageUrl = await uploadFile(file, "content");
      
      clearInterval(progressInterval);
      setCoverImageUploadProgress(100);
      
      // Set the uploaded image URL
      setFormData(prev => ({
        ...prev,
        coverImage: imageUrl
      }));
      
      toast.success("Cover image uploaded successfully");
    } catch (error) {
      console.error("Error uploading cover image:", error);
      toast.error("Failed to upload cover image. Please try again.");
    } finally {
      setIsUploadingCoverImage(false);
      setCoverImageUploadProgress(0);
      
      // Clear the file input
      if (coverImageFileInputRef.current) {
        coverImageFileInputRef.current.value = "";
      }
    }
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetFormData();
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (newsItem: NewsItem) => {
    setSelectedNewsItem(newsItem);
    setFormData({
      title: newsItem.title,
      slug: newsItem.slug,
      excerpt: newsItem.excerpt,
      content: newsItem.content,
      coverImage: newsItem.coverImage || "",
      readTime: newsItem.readTime || "",
      author: newsItem.author || "",
      featured: newsItem.featured,
      isPublished: newsItem.isPublished,
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (newsItem: NewsItem) => {
    setSelectedNewsItem(newsItem);
    setIsDeleteDialogOpen(true);
  };

  // Handle create news
  const handleCreateNews = async () => {
    if (!formData.title || !formData.excerpt || !formData.content) {
      toast.error("Validation Error", {
        description: "Title, excerpt, and content are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await newsApi.createNews(formData);
      toast.success("News item created successfully.");
      setIsCreateDialogOpen(false);
      resetFormData();
      loadNewsItems();
    } catch (error) {
      console.error("Error creating news item:", error);
      toast.error("Failed to create news item. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update news
  const handleUpdateNews = async () => {
    if (!selectedNewsItem) return;
    
    if (!formData.title || !formData.excerpt || !formData.content) {
      toast.error("Validation Error", {
        description: "Title, excerpt, and content are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await newsApi.updateNews(selectedNewsItem.id, formData);
      toast.success("News item updated successfully.");
      setIsEditDialogOpen(false);
      loadNewsItems();
    } catch (error) {
      console.error("Error updating news item:", error);
      toast.error("Failed to update news item. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete news
  const handleDeleteNews = async () => {
    if (!selectedNewsItem) return;

    setIsSubmitting(true);
    try {
      await newsApi.deleteNews(selectedNewsItem.id);
      toast.success("News item deleted successfully.");
      setIsDeleteDialogOpen(false);
      loadNewsItems();
    } catch (error) {
      console.error("Error deleting news item:", error);
      toast.error("Failed to delete news item. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle featured status
  const toggleFeatured = async (newsItem: NewsItem) => {
    try {
      await newsApi.updateNews(newsItem.id, {
        featured: !newsItem.featured,
      });
      toast.success(`News item ${newsItem.featured ? "unfeatured" : "featured"} successfully.`);
      loadNewsItems();
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast.error("Failed to update featured status. Please try again.", {
        description: "There was an error connecting to the server.",
      });
    }
  };

  // Toggle published status
  const togglePublished = async (newsItem: NewsItem) => {
    try {
      await newsApi.updateNews(newsItem.id, {
        isPublished: !newsItem.isPublished,
      });
      toast.success(`News item ${newsItem.isPublished ? "unpublished" : "published"} successfully.`);
      loadNewsItems();
    } catch (error) {
      console.error("Error toggling published status:", error);
      toast.error("Failed to update published status. Please try again.", {
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
              placeholder="Search news..."
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
              id="publishedOnly"
              checked={showPublishedOnly}
              onCheckedChange={(checked) => setShowPublishedOnly(!!checked)}
            />
            <Label htmlFor="publishedOnly">Published only</Label>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add News
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>News Articles</CardTitle>
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
                    <TableHead>Author</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newsItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No news items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    newsItems.map((newsItem) => (
                      <TableRow key={newsItem.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            {newsItem.featured && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                            <span>{newsItem.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={newsItem.isPublished ? "default" : "secondary"}
                          >
                            {newsItem.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(newsItem.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{newsItem.author}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleFeatured(newsItem)}
                              className={`h-8 w-8 p-0 ${newsItem.featured ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-500 hover:bg-gray-50'}`}
                              title={newsItem.featured ? "Unfeature" : "Feature"}
                            >
                              {newsItem.featured ? (
                                <StarOff className="h-4 w-4" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )}
                              <span className="sr-only">{newsItem.featured ? "Unfeature" : "Feature"}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePublished(newsItem)}
                              className={`h-8 w-8 p-0 ${newsItem.isPublished ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}
                              title={newsItem.isPublished ? "Unpublish" : "Publish"}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">{newsItem.isPublished ? "Unpublish" : "Publish"}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(newsItem)}
                              className="h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(newsItem)}
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
                                <DropdownMenuItem onClick={() => openEditDialog(newsItem)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleFeatured(newsItem)}>
                                  {newsItem.featured ? (
                                    <>
                                      <StarOff className="mr-2 h-4 w-4" />
                                      Unfeature
                                    </>
                                  ) : (
                                    <>
                                      <Star className="mr-2 h-4 w-4" />
                                      Feature
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => togglePublished(newsItem)}>
                                  {newsItem.isPublished ? (
                                    <>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Publish
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(newsItem)}
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
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create News Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create News Article</DialogTitle>
            <DialogDescription>
              Add a new news article to the Techlympics 2025 website.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Enter news title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="news-article-slug"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                placeholder="Brief summary of the news article"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <RichEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="Write your news article content here..."
                minHeight="300px"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Input
                  id="coverImage"
                  name="coverImage"
                  value={formData.coverImage}
                  onChange={handleInputChange}
                  placeholder="/images/news/example.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="readTime">Read Time</Label>
                <Input
                  id="readTime"
                  name="readTime"
                  value={formData.readTime}
                  onChange={handleInputChange}
                  placeholder="5 min read"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Author name"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleCheckboxChange("featured", !!checked)}
                />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => handleCheckboxChange("isPublished", !!checked)}
                />
                <Label htmlFor="isPublished">Publish immediately</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImageFile">Upload Cover Image</Label>
              <input
                id="coverImageFile"
                type="file"
                ref={coverImageFileInputRef}
                onChange={handleCoverImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {isUploadingCoverImage && (
                <div className="mt-2 flex items-center space-x-2">
                  <progress
                    className="progress progress-primary w-1/2"
                    value={coverImageUploadProgress}
                    max="100"
                  />
                  <span>Uploading... ({coverImageUploadProgress}%)</span>
                </div>
              )}
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
            <Button onClick={handleCreateNews} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create News"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit News Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit News Article</DialogTitle>
            <DialogDescription>
              Update the news article details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  name="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Enter news title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="news-article-slug"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-excerpt">Excerpt</Label>
              <Textarea
                id="edit-excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                placeholder="Brief summary of the news article"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <RichEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="Write your news article content here..."
                minHeight="300px"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-coverImage">Cover Image URL</Label>
                <Input
                  id="edit-coverImage"
                  name="coverImage"
                  value={formData.coverImage}
                  onChange={handleInputChange}
                  placeholder="/images/news/example.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-readTime">Read Time</Label>
                <Input
                  id="edit-readTime"
                  name="readTime"
                  value={formData.readTime}
                  onChange={handleInputChange}
                  placeholder="5 min read"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-author">Author</Label>
              <Input
                id="edit-author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Author name"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleCheckboxChange("featured", !!checked)}
                />
                <Label htmlFor="edit-featured">Featured</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => handleCheckboxChange("isPublished", !!checked)}
                />
                <Label htmlFor="edit-isPublished">Published</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImageFile">Upload Cover Image</Label>
              <input
                id="coverImageFile"
                type="file"
                ref={coverImageFileInputRef}
                onChange={handleCoverImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {isUploadingCoverImage && (
                <div className="mt-2 flex items-center space-x-2">
                  <progress
                    className="progress progress-primary w-1/2"
                    value={coverImageUploadProgress}
                    max="100"
                  />
                  <span>Uploading... ({coverImageUploadProgress}%)</span>
                </div>
              )}
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
            <Button onClick={handleUpdateNews} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update News"}
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
              Are you sure you want to delete the news article &quot;
              {selectedNewsItem?.title}&quot;? This action cannot be undone.
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
              onClick={handleDeleteNews}
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
