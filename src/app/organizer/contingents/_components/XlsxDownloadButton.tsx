"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { saveAs } from "file-saver";

interface XlsxDownloadButtonProps {
  allContingents: any[];
  schoolContingents?: any[];
  independentContingents?: any[];
  contingentsWithoutContestants?: any[];
  activeTab: string;
  searchTerm: string;
  stateFilter: string;
}

export function XlsxDownloadButton({ 
  allContingents, 
  schoolContingents = [], 
  independentContingents = [], 
  contingentsWithoutContestants = [], 
  activeTab, 
  searchTerm, 
  stateFilter 
}: XlsxDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      
      // Call the API to generate the XLSX
      const response = await fetch('/api/organizer/contingents/report/xlsx', {
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
      const byteCharacters = atob(data.xlsx);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Use file-saver to trigger download
      saveAs(blob, data.filename || 'contingent_report.xlsx');

    } catch (error) {
      console.error('Error downloading XLSX report:', error);
      alert('Failed to generate XLSX report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      className="gap-1 ml-2 bg-green-600 hover:bg-green-700" 
      variant="default"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      Excel Report
    </Button>
  );
}
