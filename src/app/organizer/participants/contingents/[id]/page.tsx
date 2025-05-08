"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Users, 
  School, 
  Download, 
  UsersRound, 
  ArrowLeft
} from "lucide-react";

import ContestantsList from './_components/contestants-list';
import TeamsList from './_components/teams-list';
import ContingentOverview from './_components/contingent-overview';
import { ContingentProvider } from './_components/contingent-context';

export default function ContingentDetails({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Ensure ID is a number
  const contingentId = parseInt(params.id);

  // Handle back button
  const handleBack = () => {
    router.push('/organizer/participants');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back button and page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="mb-2" 
            onClick={handleBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Participants
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Contingent Details</h1>
          <p className="text-muted-foreground">
            Manage contestants and teams for this contingent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Main content with tabs */}
      <ContingentProvider contingentId={contingentId}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview">
              <School className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="contestants">
              <Users className="mr-2 h-4 w-4" />
              Contestants
            </TabsTrigger>
            <TabsTrigger value="teams">
              <UsersRound className="mr-2 h-4 w-4" />
              Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ContingentOverview />
          </TabsContent>

          <TabsContent value="contestants" className="space-y-4">
            <ContestantsList contingentId={contingentId} />
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <TeamsList contingentId={contingentId} />
          </TabsContent>
        </Tabs>
      </ContingentProvider>
    </div>
  );
}
