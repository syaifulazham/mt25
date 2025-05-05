import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface VideoModalProps {
  videoId: string;
  title: string;
  triggerText: string;
  width?: number;
  height?: number;
  buttonClassName?: string;
  type?: 'google-drive' | 'youtube';
}

export function VideoModal({
  videoId,
  title,
  triggerText,
  width = 640,
  height = 360,
  buttonClassName,
  type = 'google-drive',
}: VideoModalProps) {
  // Generate the appropriate embed URL based on video type
  const videoUrl = type === 'youtube'
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : `https://drive.google.com/file/d/${videoId}/preview`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={buttonClassName || "bg-green-600 hover:bg-green-700 text-white"}>{triggerText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </DialogHeader>
        <div className="flex justify-center overflow-hidden p-1">
          <div className="relative aspect-video w-full max-w-4xl">
            <iframe
              src={videoUrl}
              width="100%"
              height="100%"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="border-0 absolute inset-0"
              title={title}
            ></iframe>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
