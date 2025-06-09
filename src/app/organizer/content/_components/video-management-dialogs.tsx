"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { isYoutubeUrl, isGoogleDriveUrl } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

// Video groups
export const videoGroups = [
  { value: "Main page", label: "Main page" },
  { value: "Registration", label: "Registration" },
  { value: "Trainings", label: "Trainings" },
];

// Types
export interface Video {
  id: number;
  group_name: string;
  title: string;
  video_description: string | null;
  video_link: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface VideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoData: any) => void;
  video: Video | null;
  isProcessing: boolean;
}

export function VideoDialog({
  isOpen,
  onClose,
  onSave,
  video,
  isProcessing
}: VideoDialogProps) {
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    group_name: "Main page",
    video_description: "",
    video_link: "",
    isActive: true
  });

  // Validation state
  const [formErrors, setFormErrors] = useState({
    title: false,
    video_link: false
  });

  // Video link validation
  const [videoUrlType, setVideoUrlType] = useState<"youtube" | "drive" | "invalid" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset form data when dialog opens or video changes
    if (isOpen) {
      if (video) {
        setFormData({
          title: video.title || "",
          group_name: video.group_name || "Main page",
          video_description: video.video_description || "",
          video_link: video.video_link || "",
          isActive: video.isActive
        });
        validateVideoLink(video.video_link);
      } else {
        setFormData({
          title: "",
          group_name: "Main page",
          video_description: "",
          video_link: "",
          isActive: true
        });
        setVideoUrlType(null);
        setPreviewUrl(null);
      }
      // Reset form errors
      setFormErrors({
        title: false,
        video_link: false
      });
    }
  }, [isOpen, video]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (name in formErrors) {
      setFormErrors(prev => ({ ...prev, [name]: false }));
    }

    // Validate video link in real-time
    if (name === "video_link") {
      validateVideoLink(value);
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateVideoLink = (url: string) => {
    if (!url) {
      setVideoUrlType(null);
      setPreviewUrl(null);
      return;
    }
    
    if (isYoutubeUrl(url)) {
      setVideoUrlType("youtube");
      // Convert YouTube URL to embed format
      let embedUrl = url;
      
      // Convert youtube.com/watch?v=ID to youtube.com/embed/ID
      if (url.includes("youtube.com/watch")) {
        const videoId = new URL(url).searchParams.get("v");
        if (videoId) {
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }
      // Convert youtu.be/ID to youtube.com/embed/ID
      else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1].split("?")[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      
      setPreviewUrl(embedUrl);
    } 
    else if (isGoogleDriveUrl(url)) {
      setVideoUrlType("drive");
      // Convert Google Drive URL to embed format
      let embedUrl = url;
      
      // Convert direct link to embed format
      if (url.includes("/view")) {
        // Extract file ID
        const fileId = url.match(/\/d\/([^\/]+)/)?.[1] || 
                      url.match(/id=([^&]+)/)?.[1];
        
        if (fileId) {
          embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
      
      setPreviewUrl(embedUrl);
    } 
    else {
      setVideoUrlType("invalid");
      setPreviewUrl(null);
    }
  };

  const validate = () => {
    const errors = {
      title: !formData.title.trim(),
      video_link: !formData.video_link.trim() || videoUrlType === "invalid"
    };
    
    setFormErrors(errors);
    return !Object.values(errors).includes(true);
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{video ? "Edit Video" : "Add New Video"}</DialogTitle>
          <DialogDescription>
            {video ? "Update video details" : "Enter the details for the new video"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="flex items-center">
              Video Title <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={formErrors.title ? "border-red-500" : ""}
              disabled={isProcessing}
            />
            {formErrors.title && (
              <p className="text-red-500 text-sm">Title is required</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group_name">Group</Label>
            <Select
              value={formData.group_name}
              onValueChange={(value) => handleSelectChange("group_name", value)}
              disabled={isProcessing}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {videoGroups.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video_description">Description</Label>
            <Textarea
              id="video_description"
              name="video_description"
              value={formData.video_description || ""}
              onChange={handleInputChange}
              rows={3}
              disabled={isProcessing}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video_link" className="flex items-center">
              Video Link <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="video_link"
              name="video_link"
              value={formData.video_link}
              onChange={handleInputChange}
              className={formErrors.video_link ? "border-red-500" : ""}
              disabled={isProcessing}
              placeholder="YouTube or Google Drive link"
            />
            {formErrors.video_link && (
              <p className="text-red-500 text-sm">Valid YouTube or Google Drive video URL is required</p>
            )}
            {videoUrlType === "youtube" && (
              <div className="text-sm text-green-600 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                Valid YouTube URL detected
              </div>
            )}
            {videoUrlType === "drive" && (
              <div className="text-sm text-green-600 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                Valid Google Drive URL detected
              </div>
            )}
            {videoUrlType === "invalid" && formData.video_link && (
              <div className="text-sm text-red-500 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                URL must be a valid YouTube or Google Drive video link
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="grid gap-2">
              <Label>Video Preview</Label>
              <div className="aspect-video w-full">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border rounded"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleCheckboxChange("isActive", checked as boolean)}
              disabled={isProcessing}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? "Saving..." : video ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  videoTitle?: string;
}

export function DeleteVideoDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  videoTitle = "this video"
}: DeleteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Video</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {videoTitle}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
