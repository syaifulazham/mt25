"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { VideoModal } from "@/components/ui/video-modal";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  videoUrl: string;
  type: 'google-drive' | 'youtube';
}

// Interface matching the database model
interface VideoModel {
  id: number;
  group_name: string;
  title: string;
  video_description: string | null;
  video_link: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

function extractVideoId(url: string): string {
  if (url.includes('drive.google.com')) {
    // For Google Drive videos
    const idMatch = url.match(/[-\w]{25,}/);
    return idMatch ? idMatch[0] : '';
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    // For YouTube videos
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return ytMatch ? ytMatch[1] : '';
  }
  return '';
}

export default function VideoGalleryClient() {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Add a cache-busting parameter to prevent stale data
        const response = await fetch(`/api/videos?t=${new Date().getTime()}`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch videos: ${response.status}`);
        }
        
        const data: VideoModel[] = await response.json();
        
        // Map the API response to our Video interface
        const mappedVideos = data.map(video => {
          // Determine video type from the link
          const isYoutube = video.video_link.includes('youtube.com') || video.video_link.includes('youtu.be');
          const type = isYoutube ? 'youtube' as const : 'google-drive' as const;
          
          // Generate thumbnail URL based on video type and ID
          let thumbnailUrl;
          if (isYoutube) {
            const videoId = extractVideoId(video.video_link);
            thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
          } else {
            // For Google Drive, we don't have automatic thumbnails
            // Could use a default thumbnail or leave undefined
            thumbnailUrl = '/images/videos/default-thumbnail.jpg';
          }
          
          return {
            id: String(video.id),
            title: video.title,
            description: video.video_description || '',
            videoUrl: video.video_link,
            thumbnailUrl,
            type
          };
        });
        
        setVideos(mappedVideos);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideos();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-md overflow-hidden border bg-card">
            <Skeleton className="aspect-video w-full" />
            <div className="p-3">
              <Skeleton className="h-5 w-4/5 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (videos.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          {t('videos.no_videos_available')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {videos.map((video) => (
        <div 
          key={video.id} 
          className="rounded-md overflow-hidden border bg-card hover:bg-accent/10 transition-colors group"
        >
          {/* Video thumbnail with play overlay */}
          <div className="relative aspect-video w-full bg-muted/50 overflow-hidden">
            {video.thumbnailUrl ? (
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground text-xs">Video Preview</span>
              </div>
            )}
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="bg-primary text-primary-foreground rounded-full p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Video details */}
          <div className="p-3">
            <h3 className="font-medium text-sm mb-1 truncate" title={video.title}>
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2" title={video.description}>
              {video.description}
            </p>
            <VideoModal 
              videoId={extractVideoId(video.videoUrl)}
              title={video.title}
              triggerText={t('videos.watch_video')}
              buttonClassName="w-full text-xs py-1 h-8"
              type={video.type}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
