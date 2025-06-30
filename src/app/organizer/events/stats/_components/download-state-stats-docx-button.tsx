"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface DownloadStateStatsDocxButtonProps {
  zoneId: number;
  zoneName: string;
  stateId: number;
  stateName: string;
}

export function DownloadStateStatsDocxButton({ 
  zoneId, 
  zoneName, 
  stateId,
  stateName 
}: DownloadStateStatsDocxButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleDownload = async () => {
    try {
      setIsLoading(true);
      toast.loading("Generating DOCX file...");
      
      const response = await fetch(`/api/organizer/events/stats/${zoneId}/${stateId}/download-docx`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate document");
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/['";]/g, "")
        : `${stateName}_Statistics.docx`;
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success("DOCX file generated successfully");
    } catch (error) {
      console.error("Error downloading DOCX:", error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to generate document");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleDownload}
      disabled={isLoading}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Download size={16} />
      {isLoading ? "Generating..." : "Download DOCX"}
    </Button>
  );
}
