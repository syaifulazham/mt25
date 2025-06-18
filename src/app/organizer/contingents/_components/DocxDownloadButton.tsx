"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { saveAs } from "file-saver";

interface DocxDownloadButtonProps {
  allContingents: any[];
  schoolContingents?: any[];
  independentContingents?: any[];
  contingentsWithoutContestants?: any[];
  activeTab: string;
  searchTerm: string;
  stateFilter: string;
}

export function DocxDownloadButton({ 
  allContingents, 
  schoolContingents = [], 
  independentContingents = [], 
  contingentsWithoutContestants = [], 
  activeTab, 
  searchTerm, 
  stateFilter 
}: DocxDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      
      // Call the API to generate the DOCX
      const response = await fetch('/api/organizer/contingents/report/docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search: searchTerm,
          stateFilter: stateFilter,
          tab: activeTab
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error generating report');
      }

      // Convert base64 to Blob
      const byteCharacters = atob(data.docx);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      // Use file-saver to trigger download
      saveAs(blob, data.filename || 'contingent_report.docx');

    } catch (error) {
      console.error('Error downloading DOCX report:', error);
      alert('Failed to generate DOCX report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      className="gap-1 ml-2 bg-blue-600 hover:bg-blue-700 text-white" 
      variant="default"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      DOCX Report
    </Button>
  );
}
