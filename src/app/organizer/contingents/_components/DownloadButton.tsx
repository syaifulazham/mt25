"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadButtonProps {
  allContingents: any[];
  schoolContingents?: any[];
  independentContingents?: any[];
  contingentsWithoutContestants?: any[];
  activeTab: string;
  searchTerm: string;
  stateFilter: string;
}

export function DownloadButton({ 
  allContingents, 
  schoolContingents = [], 
  independentContingents = [], 
  contingentsWithoutContestants = [], 
  activeTab, 
  searchTerm, 
  stateFilter 
}: DownloadButtonProps) {
  const handleDownload = () => {
    // Generate CSV content
    const headers = [
      "Name", 
      "Institution", 
      "State",
      "Contestants", 
      "Primary Contact", 
      "Email", 
      "Phone",
      "Created Date"
    ];
    
    // Select the appropriate contingent list based on the active tab
    let contingentsToExport: any[] = [];
    
    switch (activeTab) {
      case "schools":
        contingentsToExport = schoolContingents;
        break;
      case "independent":
        contingentsToExport = independentContingents;
        break;
      case "no-contestants":
        contingentsToExport = contingentsWithoutContestants;
        break;
      case "all":
      default:
        contingentsToExport = allContingents;
        break;
    }
    
    // Map contingent data to CSV rows
    const rows = contingentsToExport.map((contingent: any) => {
      // Determine institution name based on contingent type
      const institution = 
        contingent.school?.name || 
        contingent.higherInstitution?.name || 
        contingent.independent?.name || 
        "No institution";
      
      // Get state information
      const state = 
        contingent.school?.state?.name || 
        contingent.higherInstitution?.state?.name || 
        contingent.independent?.state?.name || 
        "";
        
      // Get manager information if available
      const primaryContact = contingent.managers && contingent.managers[0] 
        ? contingent.managers[0].participant.name 
        : "Not assigned";
      
      const email = contingent.managers && contingent.managers[0] 
        ? contingent.managers[0].participant.email 
        : "-";
        
      const phone = contingent.managers && contingent.managers[0] && contingent.managers[0].participant.phoneNumber 
        ? contingent.managers[0].participant.phoneNumber 
        : "-";
      
      // Format date
      const createdDate = new Date(contingent.createdAt).toLocaleDateString();
      
      return [
        contingent.name,
        institution,
        state,
        contingent._count.contestants.toString(),
        primaryContact,
        email,
        phone,
        createdDate
      ];
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.join(","))
    ].join("\n");
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    // Create a download link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    // Set file name to include filters if applied
    let fileName = "contingents";
    if (searchTerm) fileName += `_search-${searchTerm}`;
    if (stateFilter) fileName += `_state-${stateFilter}`;
    fileName += `.csv`;
    
    // Set up the download link
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    
    // Append to the document, trigger download, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleDownload} className="gap-1">
      <Download className="h-4 w-4" />
      Download List
    </Button>
  );
}
