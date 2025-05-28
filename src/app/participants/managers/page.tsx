"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Clock,
  EyeIcon,
  MoreHorizontal,
  FileText,
  Mail,
  Phone,
  Loader2,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Team {
  id: number;
  name: string;
  hashcode?: string;
  contingentId?: number;
  contingentName?: string;
  contestId?: number;
  contestName?: string;
  contestCode?: string;
}

interface Manager {
  id: number;
  name: string;
  ic: string;
  email: string | null;
  phoneNumber: string | null;
  hashcode: string;
  teamId: number | null;
  teamName?: string;
  teams?: Team[];
  createdAt: string;
}

export default function ManagersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [managerToDelete, setManagerToDelete] = useState<Manager | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Team assignment modal states
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isSavingTeams, setIsSavingTeams] = useState(false);

  // Fetch managers
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        // Add timestamp to force cache refresh and avoid stale data
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/participants/managers?_=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch managers");
        }
        
        const data = await response.json();
        console.log('Managers data received from API:', data);
        
        // Enhanced debugging information
        if (data.length > 0) {
          console.log('Sample manager fields:', Object.keys(data[0]));
          console.log('First manager data:', JSON.stringify(data[0]));
        }
        
        // Force data transformation and fetch team data for each manager
        const processedData = await Promise.all(data.map(async (manager: any) => {
          console.log('Processing manager:', manager.name);
          
          // Fetch teams for this manager
          let teams = [];
          try {
            const teamsResponse = await fetch(`/api/participants/managers/${manager.id}/teams`);
            if (teamsResponse.ok) {
              teams = await teamsResponse.json();
            }
          } catch (error) {
            console.error(`Error fetching teams for manager ${manager.id}:`, error);
          }
          
          return {
            id: manager.id,
            name: manager.name,
            ic: manager.ic,
            // Explicitly ensure email and phoneNumber are strings, never undefined
            email: manager.email || '', 
            phoneNumber: manager.phoneNumber || '',
            hashcode: manager.hashcode,
            teamId: manager.teamId,
            teamName: manager.teamName,
            teams: teams,
            createdAt: manager.createdAt
          };
        }));
        
        setManagers(processedData);
        setFilteredManagers(processedData);
      } catch (error) {
        console.error("Error fetching managers:", error);
        toast.error("Failed to load managers");
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchManagers();
    }
  }, [status]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredManagers(managers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredManagers(
        managers.filter(
          (manager) =>
            manager.name.toLowerCase().includes(query) ||
            manager.hashcode.toLowerCase().includes(query) ||
            manager.ic.includes(query) ||
            (manager.teamName && manager.teamName.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, managers]);

  // Format IC number for display (masked for privacy)
  const formatIC = (ic: string) => {
    if (ic.length === 12) {
      return `${ic.substring(0, 6)}-XX-${ic.substring(10, 12)}`;
    }
    return ic;
  };

  // Open team assignment modal for a manager
  const openTeamAssignmentModal = async (manager: Manager) => {
    setSelectedManager(manager);
    
    // Initialize selected teams from manager's current teams
    const currentTeamIds = manager.teams?.map(team => team.id) || [];
    setSelectedTeamIds(currentTeamIds);
    
    // Fetch all available teams
    setIsLoadingTeams(true);
    try {
      // Add timestamp to force cache refresh and avoid stale data
      const timestamp = new Date().getTime();
      // This is a special API call to get all teams that a manager can be assigned to
      const response = await fetch(`/api/participants/all-teams?_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      setAvailableTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error(t('manager.error_teams'));
    } finally {
      setIsLoadingTeams(false);
    }
    
    setTeamsModalOpen(true);
  };
  
  // Toggle team selection
  const toggleTeamSelection = (teamId: number) => {
    setSelectedTeamIds(prevIds => {
      if (prevIds.includes(teamId)) {
        return prevIds.filter(id => id !== teamId);
      } else {
        return [...prevIds, teamId];
      }
    });
  };
  
  // Save team assignments
  const saveTeamAssignments = async () => {
    if (!selectedManager) return;
    
    setIsSavingTeams(true);
    try {
      const response = await fetch(`/api/participants/managers/${selectedManager.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Include all required fields from the manager
          name: selectedManager.name,
          ic: selectedManager.ic,
          email: selectedManager.email,
          phoneNumber: selectedManager.phoneNumber,
          teamIds: selectedTeamIds,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update team assignments');
      }
      
      // Update local state
      const updatedManagers = managers.map(manager => {
        if (manager.id === selectedManager.id) {
          // Find team objects from selected IDs
          const assignedTeams = availableTeams.filter(team => 
            selectedTeamIds.includes(team.id)
          );
          
          return {
            ...manager,
            teams: assignedTeams,
          };
        }
        return manager;
      });
      
      setManagers(updatedManagers);
      setFilteredManagers(
        searchQuery.trim() === "" 
          ? updatedManagers 
          : updatedManagers.filter(manager => {
              const query = searchQuery.toLowerCase();
              return (
                manager.name.toLowerCase().includes(query) ||
                manager.hashcode.toLowerCase().includes(query) ||
                manager.ic.includes(query) ||
                (manager.teamName && manager.teamName.toLowerCase().includes(query))
              );
            })
      );
      
      toast.success(t('manager.teams_updated'));
      setTeamsModalOpen(false);
    } catch (error) {
      console.error('Error updating team assignments:', error);
      toast.error(t('manager.error_updating_teams'));
    } finally {
      setIsSavingTeams(false);
    }
  };

  // Handle delete manager
  const handleDeleteManager = async () => {
    if (!managerToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/participants/managers/${managerToDelete.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete manager");
      }
      
      // Update the local state
      setManagers(managers.filter((manager) => manager.id !== managerToDelete.id));
      setFilteredManagers(filteredManagers.filter((manager) => manager.id !== managerToDelete.id));
      
      toast.success(t('manager.delete_success'));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting manager:", error);
      toast.error(t('manager.delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }

  return (
    <div className="container px-4 py-8 mx-auto space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">{t('manager.title')}</h1>
          <p className="text-muted-foreground">
            {t('manager.description')}
          </p>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('manager.search')}
              className="pl-8 w-full sm:w-[260px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button asChild>
            <Link href="/participants/managers/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('manager.add')}
            </Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('manager.listing')}</CardTitle>
          <CardDescription>
            {t('manager.description')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">{t('manager.none_found')}</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {managers.length === 0
                  ? t('manager.none_added')
                  : t('manager.no_search_results')}
              </p>
              {managers.length === 0 && (
                <Button asChild>
                  <Link href="/participants/managers/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('manager.add_first')}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('manager.table.name')}</TableHead>
                    <TableHead>{t('manager.table.contact')}</TableHead>
                    <TableHead>{t('manager.table.team')}</TableHead>
                    <TableHead className="text-right">{t('manager.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredManagers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{manager.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {/* Simplified and robust contact info display */}
                          {(manager.email || manager.phoneNumber) ? (
                            <>
                              {manager.email && (
                                <div className="flex items-center gap-1" title={manager.email}>
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="truncate max-w-[150px]">{manager.email}</span>
                                </div>
                              )}
                              {manager.phoneNumber && (
                                <div className="flex items-center gap-1" title={manager.phoneNumber}>
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{manager.phoneNumber}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">{t('manager.no_contact')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="group relative cursor-pointer p-1 -m-1 rounded-md hover:bg-muted transition-colors"
                          onClick={() => openTeamAssignmentModal(manager)}
                          title={t('manager.click_to_assign_teams')}
                        >
                          {manager.teams && manager.teams.length > 0 ? (
                            manager.teams.length === 1 ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span className="text-blue-600">{manager.teams[0].name}</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {manager.teams.length}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{t('manager.teams')}</span>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          ) : manager.teamName && manager.teamId ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span className="text-blue-600">{manager.teamName}</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground text-sm">{t('manager.not_assigned')}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild title={t('manager.view')}>
                            <Link href={`/participants/managers/${manager.id}`}>
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button variant="outline" size="sm" asChild title={t('manager.edit')}>
                            <Link href={`/participants/managers/${manager.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:bg-red-100 hover:text-red-700" 
                            title={t('manager.delete')}
                            onClick={() => {
                              setManagerToDelete(manager);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('manager.delete')}</DialogTitle>
            <DialogDescription>
              {managerToDelete?.name ? 
                t('manager.delete_confirm').replace('{name}', managerToDelete.name) : 
                t('manager.delete_confirm').replace('{name}', '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('manager.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteManager}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('manager.deleting')}
                </>
              ) : (
                <>{t('manager.delete')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Team assignment modal */}
      <Dialog open={teamsModalOpen} onOpenChange={(open) => {
        if (!isSavingTeams) setTeamsModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('manager.assign_teams')}</DialogTitle>
            <DialogDescription>
              {selectedManager && t('manager.assign_teams_description').replace('{name}', selectedManager.name)}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingTeams ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">{t('manager.loading_teams')}</span>
            </div>
          ) : (
            <div className="py-4">
              {availableTeams.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {t('manager.no_teams')}
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {availableTeams.map(team => (
                      <div key={team.id} className="flex items-start space-x-3 p-2 hover:bg-muted rounded-md transition-colors">
                        <Checkbox 
                          id={`team-${team.id}`} 
                          checked={selectedTeamIds.includes(team.id)}
                          onCheckedChange={() => toggleTeamSelection(team.id)}
                        />
                        <div className="space-y-1 w-full">
                          <div className="flex items-center justify-between">
                            <label 
                              htmlFor={`team-${team.id}`}
                              className="font-medium cursor-pointer text-sm"
                            >
                              {team.name}
                            </label>
                            {team.contestCode && (
                              <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                {team.contestCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {team.contestName && (
                              <p className="text-xs text-blue-600">
                                {team.contestName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setTeamsModalOpen(false)}
              disabled={isSavingTeams}
              className="mt-2 sm:mt-0"
            >
              {t('manager.cancel')}
            </Button>
            
            <Button 
              onClick={saveTeamAssignments} 
              disabled={isLoadingTeams || isSavingTeams || availableTeams.length === 0}
              className="mt-2 sm:mt-0"
            >
              {isSavingTeams ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('manager.saving')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('manager.save_teams')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
