"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, School, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import UnifiedSearchClient from "./_components/unified-search-client";

// Stats card interface
interface StatsCard {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

export default function ParticipantsPage() {
  // Stats data for dashboard cards
  const statsCards: StatsCard[] = [
    {
      title: "Contestants",
      value: "2,456",
      description: "Total registered contestants",
      icon: <Users className="h-5 w-5 text-blue-600" />,
      href: "/organizer/participants/contestants"
    },
    {
      title: "Contingents",
      value: "138",
      description: "Active contingents",
      icon: <UsersRound className="h-5 w-5 text-green-600" />,
      href: "/organizer/participants/contingents"
    },
    {
      title: "Schools",
      value: "75",
      description: "Participating institutions",
      icon: <School className="h-5 w-5 text-amber-600" />,
      href: "/organizer/participants/schools"
    }
  ];
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Participant Management" 
        description="Search and manage all participants in the Techlympics system"
      />
      
      {/* Unified search component */}
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl">Search Participants</CardTitle>
          <CardDescription>
            Search for contestants, contingents, schools or teams using name, IC, address or any relevant information
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <UnifiedSearchClient />
        </CardContent>
      </Card>
      
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsCards.map((card, i) => (
          <Card key={i} className="hover:bg-accent/50 transition-colors">
            <Link href={card.href} className="block h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Link>
          </Card>
        ))}
        
        {/* Add participant button */}
        <Card className="bg-primary hover:bg-primary/90 transition-colors text-primary-foreground">
          <Link href="/organizer/participants/invite" className="block h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Add Participant</CardTitle>
              <UserPlus className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Invite</div>
              <p className="text-xs mt-1 text-primary-foreground/80">Add new participants to the system</p>
            </CardContent>
          </Link>
        </Card>
      </div>
      
      <div className="border-t pt-8">
        <h3 className="text-lg font-medium mb-4">Tools & Actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/organizer/participants/contestants/bulk-upload">
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-base">Bulk Upload</CardTitle>
                <CardDescription>Import multiple contestants at once</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/organizer/participants/contestants/export">
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-base">Export Data</CardTitle>
                <CardDescription>Download participant data as CSV</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/organizer/participants/contingents/manage">
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-base">Manage Contingents</CardTitle>
                <CardDescription>Review and manage contingent requests</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
