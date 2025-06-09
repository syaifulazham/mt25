"use client";

import { useState, useEffect } from "react";
import VideoEmbed from "./video-embed";
import { useLanguage } from "@/lib/i18n/language-context";

type Video = {
  id: number;
  title: string;
  video_description: string | null;
  video_link: string;
  group_name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function VideoSection() {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        console.log('VideoSection: Fetching videos...');
        setIsLoading(true);
        const response = await fetch('/api/public-videos');
        
        if (!response.ok) {
          throw new Error(`Video API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('VideoSection: Videos fetched successfully:', data);
        setVideos(data);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideos();
  }, []);

  // Show loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg animate-pulse">
              <div className="p-3 bg-gray-700">
                <div className="h-5 bg-gray-600 rounded w-3/4"></div>
              </div>
              <div className="pt-[56.25%] h-0 relative">
                <div className="absolute inset-0 bg-gray-700"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no videos are available, don't render the section
  if (videos.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-4">{t('videos.section_title') || 'Featured Videos'}</h2>
      <p className="text-gray-300 mb-6">{t('videos.section_description') || 'Watch our latest videos and updates'}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {videos.map((video) => (
          <VideoEmbed
            key={video.id}
            videoUrl={video.video_link}
            title={video.title}
            description={video.video_description || undefined}
          />
        ))}
      </div>
    </div>
  );
}
