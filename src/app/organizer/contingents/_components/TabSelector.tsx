"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRound } from "lucide-react";
import { DownloadButton } from "./DownloadButton";

interface TabSelectorProps {
  children: React.ReactNode;
  allContingents: any[];
  schoolContingents: any[];
  independentContingents: any[];
  contingentsWithoutContestants: any[];
  searchTerm: string;
  stateFilter: string;
}

export function TabSelector({ 
  children, 
  allContingents, 
  schoolContingents, 
  independentContingents, 
  contingentsWithoutContestants,
  searchTerm,
  stateFilter
}: TabSelectorProps) {
  const [activeTab, setActiveTab] = useState("all");

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contingents</h1>
          <p className="text-muted-foreground">
            Manage all contingents participating in Techlympics 2025
          </p>
        </div>
        <DownloadButton 
          allContingents={allContingents} 
          schoolContingents={schoolContingents}
          independentContingents={independentContingents}
          contingentsWithoutContestants={contingentsWithoutContestants}
          activeTab={activeTab}
          searchTerm={searchTerm} 
          stateFilter={stateFilter} 
        />
      </div>

      <Tabs defaultValue="all" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Contingents</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="independent">
            <div className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" />
              Independent
            </div>
          </TabsTrigger>
          <TabsTrigger value="no-contestants">No Contestants</TabsTrigger>
        </TabsList>
        
        {children}
      </Tabs>
    </div>
  );
}
