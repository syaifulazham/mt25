"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NewsManagement } from "@/app/organizer/content/_components/news-management";
import { AnnouncementManagement } from "@/app/organizer/content/_components/announcement-management";
import { PhotoGalleryManagement } from "@/app/organizer/content/_components/photo-gallery-management";
import { VideoManagement } from "@/app/organizer/content/_components/video-management";

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState("news");

  return (
    <div className="space-y-6 p-6">
    <DashboardShell>
      <DashboardHeader
        heading="Content Management"
        description="Manage news articles and announcements for the Techlympics 2025 website."
      />

      <Tabs
        defaultValue="news"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="news">News Articles</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="galleries">Photo Galleries</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>
        <TabsContent value="news" className="space-y-4">
          <NewsManagement />
        </TabsContent>
        <TabsContent value="announcements" className="space-y-4">
          <AnnouncementManagement />
        </TabsContent>
        <TabsContent value="galleries" className="space-y-4">
          <PhotoGalleryManagement />
        </TabsContent>
        <TabsContent value="videos" className="space-y-4">
          <VideoManagement />
        </TabsContent>
      </Tabs>
    </DashboardShell>
    </div>
  );
}
