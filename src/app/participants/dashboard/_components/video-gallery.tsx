import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VideoGalleryClient from "./video-gallery-client";

export default function VideoGallery() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl">Training Videos</CardTitle>
      </CardHeader>
      <CardContent>
        <VideoGalleryClient />
      </CardContent>
    </Card>
  );
}
