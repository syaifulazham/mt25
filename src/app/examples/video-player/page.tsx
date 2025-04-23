"use client";

import React from 'react';
import { VideoModal } from '@/components/ui/video-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VideoPlayerExamplePage() {
  // Example Google Drive file IDs (replace these with your actual file IDs)
  const videos = [
    {
      id: "REPLACE_WITH_YOUR_FILE_ID_1",
      title: "Introduction to Techlympics",
      description: "A brief overview of the Techlympics competition"
    },
    {
      id: "REPLACE_WITH_YOUR_FILE_ID_2",
      title: "How to Register",
      description: "Step-by-step guide for registering contestants"
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Video Gallery Example</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <CardHeader>
              <CardTitle>{video.title}</CardTitle>
              <CardDescription>{video.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <VideoModal
                videoId={video.id}
                title={video.title}
                triggerText="Play Video"
                width={640}
                height={360}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-slate-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">How to Use Video Modal</h2>
        <p className="mb-4">
          To use the VideoModal component in your own pages:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Import the VideoModal component: <code>import {'{'} VideoModal {'}'} from &apos;@/components/ui/video-modal&apos;;</code></li>
          <li>Get your Google Drive file ID from the sharing link (the part after /d/ in the URL)</li>
          <li>Make sure your Google Drive video is set to &quot;Anyone with the link can view&quot;</li>
          <li>Add the VideoModal component to your page with the required props</li>
        </ol>

        <div className="mt-6 p-4 bg-slate-100 rounded">
          <pre className="text-sm overflow-x-auto">
{`<VideoModal
  videoId="YOUR_GOOGLE_DRIVE_FILE_ID"
  title="Video Title"
  triggerText="Play Video"
  width={640}
  height={360}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
