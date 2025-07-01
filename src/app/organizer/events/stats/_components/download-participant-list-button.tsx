"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { File, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface DownloadParticipantListButtonProps {
  zoneId: number;
  zoneName: string;
}

export function DownloadParticipantListButton({ zoneId, zoneName }: DownloadParticipantListButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      toast({
        title: 'Preparing document',
        description: 'Your participant list document is being generated...',
      });

      const response = await fetch(
        `/api/organizer/events/stats/${zoneId}/download-participant-list-docx`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate participant list document');
      }

      // Get the filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${zoneName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_participant_list.docx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=["']?([^"';]*)/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: 'Document Ready',
        description: 'Your participant list document has been downloaded.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download the participant list document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <File className="h-4 w-4" />
          Participant List
        </>
      )}
    </Button>
  );
}
