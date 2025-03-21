"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZonesTab } from "./_components/zones-tab";
import { StatesTab } from "./_components/states-tab";
import { SchoolsTab } from "./_components/schools-tab";
import { HigherInstitutionsTab } from "./_components/higher-institutions-tab";
import { TargetGroupsTab } from "./_components/target-groups-tab";

export default function ReferenceDataPage() {
  const [activeTab, setActiveTab] = useState("zones");

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reference Data Management</h1>
          <p className="text-muted-foreground">
            Manage global reference data for the Techlympics platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Import CSV</Button>
          <Button variant="outline">Export CSV</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="states">States</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="higher-institutions">Higher Institutions</TabsTrigger>
          <TabsTrigger value="target-groups">Target Groups</TabsTrigger>
        </TabsList>
        
        <TabsContent value="zones" className="space-y-4">
          <ZonesTab />
        </TabsContent>
        
        <TabsContent value="states" className="space-y-4">
          <StatesTab />
        </TabsContent>
        
        <TabsContent value="schools" className="space-y-4">
          <SchoolsTab />
        </TabsContent>
        
        <TabsContent value="higher-institutions" className="space-y-4">
          <HigherInstitutionsTab />
        </TabsContent>
        
        <TabsContent value="target-groups" className="space-y-4">
          <TargetGroupsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
