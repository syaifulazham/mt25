"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserRound, Plus } from "lucide-react";
import { PaginatedContestantsList } from "./paginated-contestants-list";
import { PaginatedTeamsList, PaginatedTeamsListRef } from "./paginated-teams-list";
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
  isAdmin?: boolean;
}

export function ContingentDetailTabs({ contingentData, isAdmin = false }: ContingentTabsProps) {
  const [activeTab, setActiveTab] = useState<'contestants' | 'teams'>('contestants');
  const [refreshKey, setRefreshKey] = useState(0);
  const [teamsRefreshKey, setTeamsRefreshKey] = useState(0);
  const teamsListRef = useRef<PaginatedTeamsListRef>(null);
  
  // Function to refresh the contestants list
  const refreshContestants = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Function to refresh the teams list
  const refreshTeams = () => {
    setTeamsRefreshKey(prev => prev + 1);
    // Also refresh the page to update team counts
    window.location.reload();
  };
  
  // Function to open create team dialog
  const handleCreateTeam = () => {
    teamsListRef.current?.openCreateDialog();
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
              isAdmin && (
                <Button size="sm" variant="default" onClick={handleCreateTeam}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              )
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {activeTab === 'contestants' ? (
            <PaginatedContestantsList 
              key={`contestants-${refreshKey}`}
              contestants={contingentData.contestants} 
              contingentId={contingentData.id}
              refreshData={refreshContestants}
              pageSize={5} 
            />
          ) : (
            <PaginatedTeamsList 
              ref={teamsListRef}
              key={`teams-${teamsRefreshKey}`}
              teams={contingentData.teams}
              contingentId={contingentData.id}
              isAdmin={isAdmin}
              onTeamsUpdate={refreshTeams}
              pageSize={5} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
