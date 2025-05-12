"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { uploadFile } from "@/lib/upload-service";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  MoreVertical, 
  Eye, 
  Calendar, 
  Image as ImageIcon,
  Star, 
  StarOff,
  Upload,
  X,
  GalleryHorizontal,
  ArrowUpDown,
  Check
} from "lucide-react";

// Types for photo galleries
interface PhotoGallery {
  id: number;
  title: string;
  description: string | null;
  coverPhoto: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  userId: number;
  photos?: Photo[];
  photoCount?: number;
}

// Types for photos
interface Photo {
  id: string;
  galleryId: string;
  path: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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

export function PhotoGalleryManagement() {
  const router = useRouter();
  
  // States for managing galleries
  const [galleries, setGalleries] = useState<PhotoGallery[]>([]);
  const [currentGallery, setCurrentGallery] = useState<PhotoGallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for UI
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isManagePhotosOpen, setIsManagePhotosOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [filteredGalleries, setFilteredGalleries] = useState<PhotoGallery[]>([]);
  
  // State for editing photo captions
  const [isEditPhotoOpen, setIsEditPhotoOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  
  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Temporary fix to force image reload and fix cache issues
  useEffect(() => {
    // Wait for component to be fully rendered
    const timer = setTimeout(() => {
      // Force reload all images to fix caching issues
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const currentSrc = img.src;
        if (currentSrc) {
          // Add a cache-busting parameter
          const cacheBuster = `?t=${Date.now()}`;
          // Check if the URL already has query parameters
          const newSrc = currentSrc.includes('?') 
            ? `${currentSrc}&cb=${Date.now()}` 
            : `${currentSrc}${cacheBuster}`;
          img.src = newSrc;
        }
      });
      console.log('Applied image cache-busting fix');
    }, 1000); // Wait 1 second after render
    
    return () => clearTimeout(timer);
  }, [filteredGalleries]); // Run when filtered galleries change
  const [photoTitles, setPhotoTitles] = useState<(string | null)[]>([]);
  const [photoDescriptions, setPhotoDescriptions] = useState<(string | null)[]>([]);
  
  // Pagination states
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Refs
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  // Fetch galleries on component mount
  useEffect(() => {
    fetchGalleries();
  }, [pagination.page, currentTab]);

  // Filter galleries based on search term and tab
  useEffect(() => {
    filterGalleries();
  }, [galleries, searchTerm, currentTab]);

  // Fetch galleries from API
  const fetchGalleries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      
      if (currentTab === "published") {
        params.append("publishedOnly", "true");
      } else if (currentTab === "draft") {
        params.append("draftOnly", "true");
      }
      
      const response = await fetch(`/api/photo-galleries?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch galleries: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setGalleries(data);
      } else if (data.data && Array.isArray(data.data)) {
        setGalleries(data.data);
        if (data.meta) {
          setPagination(prevState => ({
            ...prevState,
            total: data.meta.total,
            totalPages: data.meta.totalPages,
            hasNextPage: data.meta.hasNextPage,
            hasPrevPage: data.meta.hasPrevPage,
          }));
        }
      } else {
        setGalleries([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch galleries");
      console.error("Error fetching galleries:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter galleries based on search term and tab
  const filterGalleries = () => {
    let filtered = [...galleries];
    
    if (searchTerm) {
      filtered = filtered.filter(gallery => 
        gallery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gallery.description && gallery.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredGalleries(filtered);
  };

  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterGalleries();
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setPagination(prevState => ({
      ...prevState,
      page: 1,
    }));
  };

  // Reset form states
  const resetFormStates = () => {
    setTitle("");
    setDescription("");
    setIsPublished(false);
    setCoverPhotoFile(null);
    setCoverPhotoUrl(null);
    setPhotoFiles([]);
    setPreviewUrls([]);
    setPhotoTitles([]);
    setPhotoDescriptions([]);
  };

  // Handle cover photo selection
  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size - max 25MB
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (file.size > maxSize) {
        toast.error("File is too large. Maximum size is 25MB");
        // Reset the input
        if (coverPhotoInputRef.current) {
          coverPhotoInputRef.current.value = '';
        }
        return;
      }
      
      setCoverPhotoFile(file);
      
      // Create preview URL for the selected file
      const url = URL.createObjectURL(file);
      setCoverPhotoUrl(url);
    }
  };

  // Handle photo files selection
  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Check file sizes - max 25MB per file
      const maxSize = 25 * 1024 * 1024; // 25MB
      const oversizedFiles = files.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        toast.error(`${oversizedFiles.length} file(s) exceeded the maximum size of 25MB and were skipped`);
        
        // Only process files that are within the size limit
        const validFiles = files.filter(file => file.size <= maxSize);
        
        if (validFiles.length === 0) {
          // Reset the input if no valid files
          if (photosInputRef.current) {
            photosInputRef.current.value = '';
          }
          return;
        }
        
        // Continue with valid files only
        setPhotoFiles(prev => [...prev, ...validFiles]);
        
        // Create preview URLs for the valid files
        const urls = validFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...urls]);
        
        // Initialize titles and descriptions for new valid photos
        setPhotoTitles(prev => [...prev, ...Array(validFiles.length).fill(null)]);
        setPhotoDescriptions(prev => [...prev, ...Array(validFiles.length).fill(null)]);
      } else {
        // All files are valid
        setPhotoFiles(prev => [...prev, ...files]);
        
        // Create preview URLs for the selected files
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...urls]);
        
        // Initialize titles and descriptions for new photos
        setPhotoTitles(prev => [...prev, ...Array(files.length).fill(null)]);
        setPhotoDescriptions(prev => [...prev, ...Array(files.length).fill(null)]);
      }
      
      // Reset the input to allow selecting the same files again if needed
      if (photosInputRef.current) {
        photosInputRef.current.value = '';
      }
    }
  };

  // Remove a photo from the queue
  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      // Revoke the URL to avoid memory leaks
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setPhotoTitles(prev => prev.filter((_, i) => i !== index));
    setPhotoDescriptions(prev => prev.filter((_, i) => i !== index));
  };

  // Update photo title
  const updatePhotoTitle = (index: number, title: string) => {
    setPhotoTitles(prev => {
      const newTitles = [...prev];
      newTitles[index] = title;
      return newTitles;
    });
  };

  // Update photo description
  const updatePhotoDescription = (index: number, description: string) => {
    setPhotoDescriptions(prev => {
      const newDescriptions = [...prev];
      newDescriptions[index] = description;
      return newDescriptions;
    });
  };

  // Handle form submission for creating a gallery
  const handleCreateGallery = async () => {
    try {
      if (!title.trim()) {
        toast.error("Gallery title is required");
        return;
      }

      setLoading(true);
      
      // Upload cover photo if provided
      let coverPhotoPath = null;
      if (coverPhotoFile) {
        const uploadUrl = await uploadFile(coverPhotoFile, 'photo-galleries');
        coverPhotoPath = uploadUrl;
      }
      
      // Create the gallery
      const response = await fetch('/api/photo-galleries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || null,
          coverPhoto: coverPhotoPath,
          isPublished,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create gallery: ${response.status}`);
      }
      
      const gallery = await response.json();
      
      // Upload photos if provided
      if (photoFiles.length > 0) {
        for (let i = 0; i < photoFiles.length; i++) {
          const uploadUrl = await uploadFile(photoFiles[i], 'photo-galleries/photos');
          
          // Create the photo entry
          await fetch('/api/photo-galleries/photos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              galleryId: gallery.id,
              path: uploadUrl,
              title: photoTitles[i] || null,
              description: photoDescriptions[i] || null,
              sortOrder: i,
            }),
          });
        }
      }
      
      toast.success("Gallery created successfully");
      setIsCreateOpen(false);
      resetFormStates();
      fetchGalleries();
    } catch (err: any) {
      toast.error(err.message || "Failed to create gallery");
      console.error("Error creating gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare edit form
  const prepareEditForm = async (gallery: PhotoGallery) => {
    setCurrentGallery(gallery);
    setTitle(gallery.title);
    setDescription(gallery.description || "");
    setIsPublished(gallery.isPublished);
    setCoverPhotoUrl(gallery.coverPhoto);
    
    // Fetch photos for this gallery to allow editing them
    await fetchPhotos(gallery.id);
    
    setIsEditOpen(true);
  };

  // Handle form submission for updating a gallery
  const handleUpdateGallery = async () => {
    try {
      if (!currentGallery) return;
      if (!title.trim()) {
        toast.error("Gallery title is required");
        return;
      }

      setLoading(true);
      
      // Upload cover photo if a new one is provided
      let coverPhotoPath = currentGallery.coverPhoto;
      if (coverPhotoFile) {
        const uploadUrl = await uploadFile(coverPhotoFile, 'photo-galleries');
        coverPhotoPath = uploadUrl;
      }
      
      // Update the gallery
      const response = await fetch(`/api/photo-galleries/${currentGallery.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || null,
          coverPhoto: coverPhotoPath,
          isPublished,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.error === 'unauthorized') {
          throw new Error('You can only edit galleries you have created');
        }
        throw new Error(`Failed to update gallery: ${response.status}`);
      }
      
      // Upload new photos if provided
      if (photoFiles.length > 0) {
        for (let i = 0; i < photoFiles.length; i++) {
          const uploadUrl = await uploadFile(photoFiles[i], 'photo-galleries/photos');
          
          // Create the photo entry
          await fetch('/api/photo-galleries/photos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              galleryId: currentGallery.id,
              path: uploadUrl,
              title: photoTitles[i] || null,
              description: photoDescriptions[i] || null,
              sortOrder: photos.length + i, // Add at the end
            }),
          });
        }
      }
      
      toast.success("Gallery updated successfully");
      setIsEditOpen(false);
      resetFormStates();
      fetchGalleries();
    } catch (err: any) {
      toast.error(err.message || "Failed to update gallery");
      console.error("Error updating gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare delete confirmation
  const prepareDeleteGallery = (gallery: PhotoGallery) => {
    setCurrentGallery(gallery);
    setIsDeleteOpen(true);
  };

  // Toggle gallery publication status
  const handleTogglePublish = async (gallery: PhotoGallery) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/photo-galleries/${gallery.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !gallery.isPublished,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${gallery.isPublished ? 'unpublish' : 'publish'} gallery: ${response.status}`);
      }
      
      toast.success(`Gallery ${gallery.isPublished ? 'unpublished' : 'published'} successfully`);
      fetchGalleries();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${gallery.isPublished ? 'unpublish' : 'publish'} gallery`);
      console.error(`Error ${gallery.isPublished ? 'unpublishing' : 'publishing'} gallery:`, err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle gallery deletion
  const handleDeleteGallery = async () => {
    try {
      if (!currentGallery) return;

      setLoading(true);
      
      const response = await fetch(`/api/photo-galleries/${currentGallery.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete gallery: ${response.status}`);
      }
      
      toast.success("Gallery deleted successfully");
      setIsDeleteOpen(false);
      fetchGalleries();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete gallery");
      console.error("Error deleting gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch photos for a gallery
  const fetchPhotos = async (galleryId: number) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/photo-galleries/${galleryId}/photos`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch photos: ${response.status}`);
      }
      
      const data = await response.json();
      setPhotos(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch photos");
      console.error("Error fetching photos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare photo management
  const prepareManagePhotos = async (gallery: PhotoGallery) => {
    setCurrentGallery(gallery);
    await fetchPhotos(gallery.id);
    setIsManagePhotosOpen(true);
  };

  // Delete a photo
  const handleDeletePhoto = async (photoId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/photo-galleries/photos/${photoId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete photo: ${response.status}`);
      }
      
      // Refresh photos list
      if (currentGallery) {
        await fetchPhotos(currentGallery.id);
      }
      
      toast.success("Photo deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete photo");
      console.error("Error deleting photo:", err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare edit photo caption form
  const prepareEditPhotoCaption = (photo: Photo) => {
    setCurrentPhoto(photo);
    setPhotoTitle(photo.title || "");
    setPhotoDescription(photo.description || "");
    setIsEditPhotoOpen(true);
  };

  // Handle update photo caption
  const handleUpdatePhotoCaption = async () => {
    try {
      if (!currentPhoto) return;
      
      setLoading(true);
      
      const response = await fetch(`/api/photo-galleries/photos/${currentPhoto.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: photoTitle || null,
          description: photoDescription || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update photo: ${response.status}`);
      }
      
      // Refresh photos list
      if (currentGallery) {
        await fetchPhotos(currentGallery.id);
      }
      
      toast.success("Photo caption updated successfully");
      setIsEditPhotoOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update photo caption");
      console.error("Error updating photo caption:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add photos to an existing gallery
  const handleAddPhotos = async () => {
    try {
      if (!currentGallery) return;
      if (photoFiles.length === 0) {
        toast.error("Please select at least one photo");
        return;
      }

      setLoading(true);
      
      // Upload photos
      for (let i = 0; i < photoFiles.length; i++) {
        const uploadUrl = await uploadFile(photoFiles[i], 'photo-galleries/photos');
        
        // Create the photo entry
        await fetch('/api/photo-galleries/photos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            galleryId: currentGallery.id,
            path: uploadUrl,
            title: photoTitles[i] || null,
            description: photoDescriptions[i] || null,
            sortOrder: photos.length + i,
          }),
        });
      }
      
      toast.success("Photos added successfully");
      
      // Reset photo upload form
      setPhotoFiles([]);
      setPreviewUrls([]);
      setPhotoTitles([]);
      setPhotoDescriptions([]);
      
      // Refresh photos list
      await fetchPhotos(currentGallery.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to add photos");
      console.error("Error adding photos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Update photo details
  const handleUpdatePhoto = async (photo: Photo, title: string | null, description: string | null) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/photo-galleries/photos/${photo.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update photo: ${response.status}`);
      }
      
      toast.success("Photo updated successfully");
      
      // Refresh photos list
      if (currentGallery) {
        await fetchPhotos(currentGallery.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update photo");
      console.error("Error updating photo:", err);
    } finally {
      setLoading(false);
    }
  };

  // Update photo sort order
  const handleUpdatePhotoOrder = async (photoId: number, newOrder: number) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/photo-galleries/photos/${photoId}/sort`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sortOrder: newOrder,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update photo order: ${response.status}`);
      }
      
      // Refresh photos list
      if (currentGallery) {
        await fetchPhotos(currentGallery.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update photo order");
      console.error("Error updating photo order:", err);
    } finally {
      setLoading(false);
    }
  };

  // Move photo up in order
  const movePhotoUp = async (photo: Photo) => {
    if (photo.sortOrder <= 0) return;
    await handleUpdatePhotoOrder(photo.id, photo.sortOrder - 1);
  };

  // Move photo down in order
  const movePhotoDown = async (photo: Photo) => {
    if (photo.sortOrder >= photos.length - 1) return;
    await handleUpdatePhotoOrder(photo.id, photo.sortOrder + 1);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Photo Galleries</h2>
          <p className="text-muted-foreground">Manage photo galleries for the Techlympics 2025 website.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetFormStates();
              setIsCreateOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" /> Create Gallery
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Photo Gallery</DialogTitle>
              <DialogDescription>
                Create a new photo gallery to showcase images from Techlympics events and activities.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Gallery Title</Label>
                <Input
                  id="title"
                  placeholder="Enter gallery title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter gallery description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coverPhoto">Cover Photo</Label>
                {coverPhotoUrl && (
                  <div className="relative w-full h-48 mb-2 rounded-md overflow-hidden">
                    <Image
                      src={coverPhotoUrl}
                      alt="Cover photo preview"
                      fill
                      className="object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        if (coverPhotoUrl && !coverPhotoUrl.startsWith('/')){  // If it's a blob URL
                          URL.revokeObjectURL(coverPhotoUrl);
                        }
                        setCoverPhotoUrl(null);
                        setCoverPhotoFile(null);
                        if (coverPhotoInputRef.current) {
                          coverPhotoInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Input
                  id="coverPhoto"
                  type="file"
                  accept="image/*"
                  ref={coverPhotoInputRef}
                  onChange={handleCoverPhotoChange}
                />
              </div>
              <div className="grid gap-2">
                <Label>Photos</Label>
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative rounded-md overflow-hidden">
                        <div className="relative w-full h-32">
                          <Image 
                            src={url} 
                            alt={`Photo ${index + 1}`} 
                            fill
                            className="object-cover"  
                          />
                        </div>
                        <div className="p-2 bg-gray-100 dark:bg-gray-800">
                          <Input
                            placeholder="Title (optional)"
                            value={photoTitles[index] || ''}
                            onChange={(e) => updatePhotoTitle(index, e.target.value)}
                            className="mb-2 text-xs"
                          />
                          <Textarea
                            placeholder="Description (optional)"
                            value={photoDescriptions[index] || ''}
                            onChange={(e) => updatePhotoDescription(index, e.target.value)}
                            className="text-xs"
                            rows={2}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  ref={photosInputRef}
                  onChange={handlePhotosChange}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublished"
                  checked={isPublished}
                  onCheckedChange={(checked) => setIsPublished(checked === true)}
                />
                <Label htmlFor="isPublished">Publish gallery immediately</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="button" disabled={loading} onClick={handleCreateGallery}>
                {loading ? 'Creating...' : 'Create Gallery'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={handleTabChange}
          className="w-full max-w-xs"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSearch} className="w-full max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search galleries..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Galleries Grid */}
      {loading && filteredGalleries.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <CardContent className="p-4">
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 animate-pulse mb-2" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-6">
          <p className="text-center text-red-500">{error}</p>
        </Card>
      ) : filteredGalleries.length === 0 ? (
        <Card className="p-6">
          <p className="text-center">No galleries found. Create your first gallery to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGalleries.map((gallery) => (
            <Card key={gallery.id} className="overflow-hidden">
              <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-800">
                {gallery.coverPhoto ? (
                  <Image
                    src={gallery.coverPhoto}
                    alt={gallery.title}
                    fill
                    className="object-cover transition-transform hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <GalleryHorizontal className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {gallery.isPublished ? (
                  <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600">
                    Published
                  </Badge>
                ) : (
                  <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600">
                    Draft
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{gallery.title}</h3>
                    {gallery.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{gallery.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(gallery.createdAt)}</span>
                      <span>•</span>
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>{gallery.photoCount || gallery.photos?.length || 0} photos</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => prepareEditForm(gallery)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {gallery.isPublished ? (
                        <Button variant="outline" size="sm" onClick={() => handleTogglePublish(gallery)}>
                          <StarOff className="h-4 w-4 mr-2" />
                          Unpublish
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" onClick={() => handleTogglePublish(gallery)}>
                          <Star className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => prepareManagePhotos(gallery)}>
                        <GalleryHorizontal className="h-4 w-4 mr-2" />
                        Manage Photos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => prepareEditForm(gallery)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Gallery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePublish(gallery)}>
                        {gallery.isPublished ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => prepareDeleteGallery(gallery)} className="text-red-500 focus:text-red-500">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete Gallery
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filteredGalleries.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredGalleries.length}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> galleries
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Gallery Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Photo Gallery</DialogTitle>
            <DialogDescription>
              Update gallery information, settings, and manage photos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editTitle">Gallery Title</Label>
              <Input
                id="editTitle"
                placeholder="Enter gallery title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description (Optional)</Label>
              <Textarea
                id="editDescription"
                placeholder="Enter gallery description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editCoverPhoto">Cover Photo</Label>
              {coverPhotoUrl && (
                <div className="relative w-full h-48 mb-2 rounded-md overflow-hidden">
                  <Image
                    src={coverPhotoUrl}
                    alt="Cover photo preview"
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      if (coverPhotoUrl && !coverPhotoUrl.startsWith('/')) {  // If it's a blob URL
                        URL.revokeObjectURL(coverPhotoUrl);
                      }
                      setCoverPhotoUrl(null);
                      setCoverPhotoFile(null);
                      if (coverPhotoInputRef.current) {
                        coverPhotoInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Input
                id="editCoverPhoto"
                type="file"
                accept="image/*"
                ref={coverPhotoInputRef}
                onChange={handleCoverPhotoChange}
              />
            </div>
            
            {/* New section for editing existing photos */}
            {photos.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Existing Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative rounded-md overflow-hidden border">
                      <div className="relative aspect-square">
                        <Image 
                          src={photo.path}
                          alt={photo.title || 'Gallery photo'}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs truncate">{photo.title || 'Untitled'}</p>
                        {photo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{photo.description}</p>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-1 h-6 text-xs" 
                          onClick={() => prepareEditPhotoCaption(photo)}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit Caption
                        </Button>
                      </div>
                      <div className="absolute top-1 right-1 flex space-x-1">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Section for adding new photos */}
            <div className="grid gap-2 mt-4">
              <Label htmlFor="editAddPhotos">Add New Photos</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative border rounded-md overflow-hidden">
                    <div className="relative aspect-square">
                      <Image
                        src={url}
                        alt={`Photo preview ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <Input
                        placeholder="Title (optional)"
                        value={photoTitles[index] || ''}
                        onChange={(e) => updatePhotoTitle(index, e.target.value)}
                        className="mb-2 text-xs"
                      />
                      <Textarea
                        placeholder="Description (optional)"
                        value={photoDescriptions[index] || ''}
                        onChange={(e) => updatePhotoDescription(index, e.target.value)}
                        className="text-xs"
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Input
                id="editAddPhotos"
                type="file"
                accept="image/*"
                multiple
                ref={photosInputRef}
                onChange={handlePhotosChange}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editIsPublished"
                checked={isPublished}
                onCheckedChange={(checked) => setIsPublished(checked === true)}
              />
              <Label htmlFor="editIsPublished">Publish gallery</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="button" disabled={loading} onClick={handleUpdateGallery}>
              {loading ? 'Updating...' : 'Update Gallery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Photo Caption Dialog */}
      <Dialog open={isEditPhotoOpen} onOpenChange={setIsEditPhotoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Photo Caption</DialogTitle>
            <DialogDescription>
              Update the title and description for this photo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentPhoto && (
              <div className="relative w-full h-48 mb-2 rounded-md overflow-hidden">
                <Image 
                  src={currentPhoto.path}
                  alt={photoTitle || 'Gallery photo'}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="photoTitle">Title (Optional)</Label>
              <Input
                id="photoTitle"
                placeholder="Enter photo title"
                value={photoTitle}
                onChange={(e) => setPhotoTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photoDescription">Description (Optional)</Label>
              <Textarea
                id="photoDescription"
                placeholder="Enter photo description"
                value={photoDescription}
                onChange={(e) => setPhotoDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditPhotoOpen(false)}>Cancel</Button>
            <Button type="button" disabled={loading} onClick={handleUpdatePhotoCaption}>
              {loading ? 'Updating...' : 'Update Caption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gallery</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this gallery? This action cannot be undone and all photos in this gallery will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={loading} onClick={handleDeleteGallery}>
              {loading ? 'Deleting...' : 'Delete Gallery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Photos Dialog */}
      <Dialog open={isManagePhotosOpen} onOpenChange={setIsManagePhotosOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Manage Photos - {currentGallery?.title}</DialogTitle>
            <DialogDescription>
              Add, remove, or reorder photos in this gallery.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid gap-2">
              <Label>Add New Photos</Label>
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative rounded-md overflow-hidden">
                      <div className="relative w-full h-32">
                        <Image 
                          src={url} 
                          alt={`Photo ${index + 1}`} 
                          fill
                          className="object-cover"  
                        />
                      </div>
                      <div className="p-2 bg-gray-100 dark:bg-gray-800">
                        <Input
                          placeholder="Title (optional)"
                          value={photoTitles[index] || ''}
                          onChange={(e) => updatePhotoTitle(index, e.target.value)}
                          className="mb-2 text-xs"
                        />
                        <Textarea
                          placeholder="Description (optional)"
                          value={photoDescriptions[index] || ''}
                          onChange={(e) => updatePhotoDescription(index, e.target.value)}
                          className="text-xs"
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input
                  id="managePhotos"
                  type="file"
                  accept="image/*"
                  multiple
                  ref={photosInputRef}
                  onChange={handlePhotosChange}
                />
                <Button 
                  type="button" 
                  disabled={loading || photoFiles.length === 0} 
                  onClick={handleAddPhotos}
                >
                  {loading ? 'Uploading...' : 'Upload Photos'}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 mt-4">
              <Label>Existing Photos</Label>
              {photos.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No photos in this gallery yet. Upload some photos to get started.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {photos.sort((a, b) => a.sortOrder - b.sortOrder).map((photo) => (
                    <Card key={photo.id} className="overflow-hidden">
                      <div className="relative w-full h-40">
                        <Image
                          src={photo.path}
                          alt={photo.title || `Photo ${photo.id}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="mb-2">
                          <Label htmlFor={`photo-${photo.id}-title`}>Title</Label>
                          <Input
                            id={`photo-${photo.id}-title`}
                            value={photo.title || ''}
                            onChange={(e) => handleUpdatePhoto(photo, e.target.value, photo.description)}
                            placeholder="Add a title..."
                            className="mt-1"
                          />
                        </div>
                        <div className="mb-4">
                          <Label htmlFor={`photo-${photo.id}-description`}>Description</Label>
                          <Textarea
                            id={`photo-${photo.id}-description`}
                            value={photo.description || ''}
                            onChange={(e) => handleUpdatePhoto(photo, photo.title, e.target.value)}
                            placeholder="Add a description..."
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex justify-between">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={photo.sortOrder === 0}
                              onClick={() => movePhotoUp(photo)}
                            >
                              <ArrowUpDown className="h-4 w-4 mr-1" />
                              Move Up
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={photo.sortOrder === photos.length - 1}
                              onClick={() => movePhotoDown(photo)}
                            >
                              <ArrowUpDown className="h-4 w-4 mr-1" />
                              Move Down
                            </Button>
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsManagePhotosOpen(false)}>
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
