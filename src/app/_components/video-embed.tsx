"use client";

import { isYoutubeUrl, isGoogleDriveUrl } from "@/lib/utils";

interface VideoEmbedProps {
  videoUrl: string;
  title: string;
  description?: string;
}

export default function VideoEmbed({ videoUrl, title, description }: VideoEmbedProps) {
  const getEmbedUrl = (url: string) => {
    if (isYoutubeUrl(url)) {
      // Transform YouTube URLs to embed format
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&showinfo=0` : "";
    } else if (isGoogleDriveUrl(url)) {
      // Transform Google Drive URLs to embed format
      // Handle both /file/d/{id} and /view?id={id} formats
      let fileId;
      if (url.includes('/file/d/')) {
        fileId = url.match(/\/file\/d\/([\w-]+)[\/\?]/)?.[1];
      } else {
        fileId = url.match(/[\?&]id=([\w-]+)/)?.[1];
      }
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : "";
    }
    return url;
  };

  return (
    <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
      <div>
        <div className="pb-2 px-4 pt-3 bg-gray-900/70">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-gray-300 mt-1">{description}</p>}
        </div>
        <div className="relative pt-[56.25%] h-0">
          <iframe 
            src={getEmbedUrl(videoUrl)} 
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowFullScreen
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
