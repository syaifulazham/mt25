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
}

export function VideoModal({
  videoId,
  title,
  triggerText,
  width = 640,
  height = 360,
}: VideoModalProps) {
  // Google Drive embed URL format
  const videoUrl = `https://drive.google.com/file/d/${videoId}/preview`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-green-600 hover:bg-green-700 text-white">{triggerText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </DialogHeader>
        <div className="flex justify-center">
          <iframe
            src={videoUrl}
            width={width}
            height={height}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="border-0"
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
