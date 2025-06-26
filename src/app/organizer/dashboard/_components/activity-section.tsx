'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActivityTabWrapper from "./activity-tab-wrapper";
import ParticipationHistorySection from "./participation-history-section";

export default function ActivitySection() {
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <ActivityTabWrapper />
          </TabsContent>
          <TabsContent value="history">
            <ParticipationHistorySection />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
