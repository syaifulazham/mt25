"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoModal } from '@/components/ui/video-modal';
import { Skeleton } from "@/components/ui/skeleton";

interface Video {
  id: number;
  group_name: string;
  title: string;
  video_description: string | null;
  video_link: string;
  isActive: boolean;
}

export default function VideoGallery() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/videos');
        
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        
        const data = await response.json();
        setVideos(data);
        
        // Extract unique group names
        const uniqueGroups = Array.from(new Set(data.map((video: Video) => video.group_name))) as string[];
        setGroups(uniqueGroups);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Function to extract Google Drive file ID from a URL
  const extractFileId = (url: string): string => {
    // If it's already just a file ID, return it
    if (!url.includes('/')) {
      return url;
    }
    
    // Try to extract from Google Drive URL
    const match = url.match(/\/d\/([^/]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Fallback to the original string
    return url;
  };

  // Filter videos based on active tab
  const filteredVideos = activeTab === "all" 
    ? videos 
    : videos.filter(video => video.group_name === activeTab);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Videos</CardTitle>
        <CardDescription>Watch instructional and informational videos</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full max-w-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-md" />
              ))}
            </div>
          </div>
        ) : videos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No videos available at the moment.</p>
        ) : (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              {groups.map((group) => (
                <TabsTrigger key={group} value={group}>
                  {group}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => (
                  <Card key={video.id} className="overflow-hidden h-full flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{video.title}</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {video.group_name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow pb-2">
                      {video.video_description && (
                        <p className="text-sm text-muted-foreground">
                          {video.video_description}
                        </p>
                      )}
                    </CardContent>
                    <div className="p-4 pt-0 mt-auto">
                      <VideoModal
                        videoId={extractFileId(video.video_link)}
                        title={video.title}
                        triggerText="Watch Video"
                        width={640}
                        height={360}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
