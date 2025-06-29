"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserRound, Plus } from "lucide-react";
import { PaginatedContestantsList } from "./paginated-contestants-list";
import { PaginatedTeamsList } from "./paginated-teams-list";
import BulkUploadContestantsButton from "./bulk-upload-contestants-button";

export interface ContingentTabsProps {
  contingentData: {
    id: number;
    contestants: any[];
    teams: any[];
    _count: {
      contestants: number;
      teams: number;
    };
  };
}

export function ContingentDetailTabs({ contingentData }: ContingentTabsProps) {
  const [activeTab, setActiveTab] = useState<'contestants' | 'teams'>('contestants');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Function to refresh the contestants list
  const refreshContestants = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <div className="md:col-span-2">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-4">
            <Button 
              size="sm" 
              variant={activeTab === 'contestants' ? 'default' : 'outline'}
              onClick={() => setActiveTab('contestants')}
              className="gap-1"
            >
              <UserRound className="h-4 w-4" />
              Contestants ({contingentData._count.contestants})
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === 'teams' ? 'default' : 'outline'}
              onClick={() => setActiveTab('teams')}
              className="gap-1"
            >
              <Users className="h-4 w-4" />
              Teams ({contingentData._count.teams})
            </Button>
          </div>
          
          <div className="flex gap-2">
            {activeTab === 'contestants' ? (
              <>
                <BulkUploadContestantsButton 
                  contingentId={contingentData.id} 
                  refreshContestants={refreshContestants} 
                />
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {activeTab === 'contestants' ? (
            <PaginatedContestantsList 
              key={`contestants-${refreshKey}`}
              contestants={contingentData.contestants} 
              pageSize={5} 
            />
          ) : (
            <PaginatedTeamsList 
              teams={contingentData.teams} 
              pageSize={5} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
