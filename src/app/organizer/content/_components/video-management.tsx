"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  MoreVertical, 
  Eye, 
  EyeOff, 
  Video as VideoIcon,
  Youtube,
  FileVideo,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { PaginationControl } from "./pagination-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { videoApi } from "@/lib/api/videos";
import { VideoDialog, DeleteVideoDialog, Video, videoGroups } from "./video-management-dialogs";

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function VideoManagement() {
  // State management
  const [videos, setVideos] = useState<any[]>([]); // Using any[] instead of Video[] to avoid type errors
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  // Dialog states
  const [showAddEditDialog, setShowAddEditDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [currentVideo, setCurrentVideo] = useState<any | null>(null); // Using any instead of Video to avoid type errors

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadVideos();
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Load videos
  const loadVideos = async () => {
    setIsLoading(true);
    try {
      let params: any = {
        paginated: true,
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined
      };

      if (selectedGroupFilter !== "all") {
        params.group_name = selectedGroupFilter;
      }

      const response = await videoApi.getVideosPaginated(params);
      setVideos(response.data);
      setPagination(response.meta);
    } catch (error) {
      console.error("Error loading videos:", error);
      toast.error("Failed to load videos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [pagination.page, pagination.pageSize, selectedGroupFilter]);
  
  // Handle add/edit video
  const handleAddEditVideo = async (videoData: any) => {
    setIsSaving(true);
    try {
      if (currentVideo) {
        // Update video
        await videoApi.updateVideo(currentVideo.id, videoData);
        toast.success("Video updated successfully");
      } else {
        // Create new video
        await videoApi.createVideo(videoData);
        toast.success("Video added successfully");
      }
      
      // Close dialog and refresh list
      setShowAddEditDialog(false);
      loadVideos();
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error(currentVideo ? "Failed to update video" : "Failed to add video");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle delete video
  const handleDeleteVideo = async () => {
    if (!currentVideo) return;
    
    setIsDeleting(true);
    try {
      await videoApi.deleteVideo(currentVideo.id);
      toast.success("Video deleted successfully");
      setShowDeleteDialog(false);
      loadVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle toggle video status
  const toggleVideoStatus = async (video: any) => {
    try {
      await videoApi.updateVideo(video.id, { ...video, isActive: !video.isActive });
      toast.success(`Video ${video.isActive ? 'disabled' : 'enabled'} successfully`);
      loadVideos();
    } catch (error) {
      console.error("Error toggling video status:", error);
      toast.error("Failed to update video status");
    }
  };
  
  // Handle opening video in new tab
  const openVideoLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Basic UI structure
  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
        <CardTitle>Video Management</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              setCurrentVideo(null);
              setShowAddEditDialog(true);
            }}
            variant="default"
            className="h-8"
            disabled={isLoading}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Video
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-[180px]">
              <Select
                value={selectedGroupFilter}
                onValueChange={(value) => setSelectedGroupFilter(value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Filter by group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {videoGroups.map((group) => (
                    <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" onClick={() => loadVideos()} disabled={isLoading} className="h-10">
              Search
            </Button>
          </div>
        </div>

        <div className="border rounded-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Title</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : videos.length > 0 ? (
                videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="max-w-[250px] truncate">{video.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{video.group_name}</Badge>
                    </TableCell>
                    <TableCell>
                      {video.video_link && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          {video.video_link.includes('youtube') ? (
                            <Youtube className="h-3 w-3 mr-1" />
                          ) : video.video_link.includes('drive.google') ? (
                            <FileVideo className="h-3 w-3 mr-1" />
                          ) : (
                            <VideoIcon className="h-3 w-3 mr-1" />
                          )}
                          <span>
                            {video.video_link.includes('youtube') 
                              ? 'YouTube' 
                              : video.video_link.includes('drive.google') 
                                ? 'Drive' 
                                : 'Video'
                            }
                          </span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(video.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={video.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                        {video.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openVideoLink(video.video_link)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" /> Open Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCurrentVideo(video);
                              setShowAddEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleVideoStatus(video)}
                          >
                            {video.isActive ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" /> Disable
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" /> Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setCurrentVideo(video);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No videos found. Add a new video to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Display pagination if there are videos */}
        {!isLoading && videos.length > 0 && pagination.total > pagination.pageSize && (
          <div className="mt-4 flex justify-center">
            <PaginationControl
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination({ ...pagination, page })}
            />
          </div>
        )}
      </CardContent>

      {/* Video dialog for add/edit */}
      <VideoDialog
        isOpen={showAddEditDialog}
        onClose={() => setShowAddEditDialog(false)}
        onSave={handleAddEditVideo}
        video={currentVideo}
        isProcessing={isSaving}
      />

      {/* Delete dialog */}
      <DeleteVideoDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteVideo}
        isDeleting={isDeleting}
        videoTitle={currentVideo?.title}
      />
    </Card>
  );
}
