"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ZoneRegistrationProps {
  participantId: number;
}

interface TeamMember {
  id: number;
  name: string;
  role: string | null;
  age: string;
  class_grade: string;
  inMultipleTeams: boolean;
  mismatchContest: boolean;
}

interface TeamManager {
  id: number;
  participant?: {
    id: number;
    name: string;
  };
}

interface ManagerTeam {
  id: number;
  manager: {
    id: number;
    name: string;
    email?: string;
    phoneNumber?: string;
  };
}

interface Team {
  id: number;
  recordNumber: number;
  teamName: string;
  contestName: string;
  contestCode: string;
  numberOfMembers: number;
  status: string;
  hasMultipleTeamMembers?: boolean;
  hasMembersOutsideAgeRange?: boolean;
  ineligibleMembersCount?: number;
  members: TeamMember[];
  managers?: TeamManager[];
  managerTeams?: ManagerTeam[];
}

export default function ZoneRegistrationSection({ participantId }: ZoneRegistrationProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTeamDetails, setOpenTeamDetails] = useState<Team | null>(null);

  // Fetch registered teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch(`/api/participants/zone-registration?participantId=${participantId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch registration data");
        }
        const data = await response.json();
        console.log("Received teams data:", data); // Debug
        // Extract the teams array from the response object
        setTeams(data.teams || []);
        setLoading(false);
      } catch (err) {
        setError("Error loading registration data");
        setLoading(false);
        console.error("Error fetching teams:", err);
      }
    };

    fetchTeams();
  }, [participantId]); // Add dependency

  // Handle accepting a team registration
  const handleAccept = async (teamId: number) => {
    try {
      const response = await fetch("/api/participants/zone-registration/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept registration");
      }

      // Update the local state to reflect the change
      setTeams(
        teams.map((team) => 
          team.id === teamId ? { ...team, status: "ACCEPTED" } : team
        )
      );

      toast({
        title: "Success",
        description: "Team registration accepted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to accept team registration",
        variant: "destructive",
      });
    }
  };

  // Show team members when expand is clicked
  const handleViewMembers = async (team: Team) => {
    try {
      // Fetch team members with multiple teams info
      const response = await fetch(`/api/participants/zone-registration/members?teamId=${team.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      
      const members = await response.json();
      
      // Count ineligible members based on mismatchContest flag
      const ineligibleCount = members.filter((m: any) => m.mismatchContest).length;
      
      // Update the team with the fetched members data
      setOpenTeamDetails({
        ...team,
        members: members,
        ineligibleMembersCount: ineligibleCount
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    }
  };

  // Close dialog
  const closeDialog = () => {
    setOpenTeamDetails(null);
  };

  if (loading) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg mb-6">
        <h2 className="text-sm font-medium mb-3">{t('dashboard.zone_registration')}</h2>
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg mb-6">
        <h2 className="text-sm font-medium mb-3">{t('dashboard.zone_registration')}</h2>
        <div className="p-4 text-center text-red-500">{error}</div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg mb-6">
        <h2 className="text-sm font-medium mb-3">{t('dashboard.zone_registration')}</h2>
        <div className="p-4 text-center text-muted-foreground">{t('dashboard.no_zone_registrations')}</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/50 rounded-lg mb-6">
      <h2 className="text-sm font-medium mb-3">{t('dashboard.zone_registration')}</h2>
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>{t('dashboard.team_name')}</TableHead>
              <TableHead className="text-center">{t('dashboard.number_of_members')}</TableHead>
              <TableHead>{t('dashboard.trainer')}</TableHead>
              <TableHead className="text-center">{t('dashboard.status')}</TableHead>
              <TableHead className="text-right">{t('dashboard.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.recordNumber}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium">{team.teamName}</div>
                    <div className="text-xs text-muted-foreground">{`${team.contestCode} - ${team.contestName}`}</div>
                    {team.hasMultipleTeamMembers && (
                      <div className="text-xs text-red-600 font-medium mt-1">
                        {t('dashboard.has_members_in_multiple_teams')}
                      </div>
                    )}
                    {team.hasMembersOutsideAgeRange && (
                      <div className="text-xs text-amber-600 font-medium mt-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {t('dashboard.ineligible_members_count').replace('{count}', String(team.ineligibleMembersCount || 0))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">{team.numberOfMembers}</TableCell>
                <TableCell>
                  {team.managerTeams && team.managerTeams.length > 0
                    ? <div className="flex flex-col">
                        {team.managerTeams.map((mt, index) => (
                          <div key={index} className="mb-1">
                            <div className="font-medium cursor-pointer hover:text-primary hover:underline" 
                                 onClick={() => mt.manager?.id && router.push(`/participants/managers/${mt.manager.id}/edit`)}>
                              {index + 1}. {mt.manager?.name}
                            </div>
                            <div className="text-xs text-muted-foreground pl-3">
                              {mt.manager?.email || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    : '-'
                  }
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      team.status === "ACCEPTED"
                        ? "bg-green-100 text-green-800"
                        : team.status === "APPROVED"
                        ? "bg-blue-100 text-blue-800"
                        : team.status === "CONDITIONAL"
                        ? "bg-orange-100 text-orange-800"
                        : team.status === "PENDING"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {team.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    {(team.status === 'APPROVED' || team.status === 'APPROVED_SPECIAL' || (team.status === 'CONDITIONAL' && !team.hasMultipleTeamMembers)) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAccept(team.id)}
                      >
                        {t('dashboard.accept')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewMembers(team)}
                    >
                      {t('dashboard.view_members')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Team members dialog */}
      <Dialog open={!!openTeamDetails} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openTeamDetails?.teamName} - {t('dashboard.team_members')}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('dashboard.name')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Removed ineligible members message banner from the dialog as requested */}
                {openTeamDetails?.members.map((member, index) => (
                  <TableRow key={member.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className={member.inMultipleTeams || member.mismatchContest ? "bg-red-100" : ""}>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('dashboard.darjah')}/{t('dashboard.tingkatan')}: {member.class_grade || '-'} | {t('dashboard.age')}: {member.age || '-'}
                        </div>
                        {member.inMultipleTeams && (
                          <span className="text-xs text-red-600 font-medium block mt-1">
                            (Multiple Teams)
                          </span>
                        )}
                        {member.mismatchContest && (
                          <span className="text-xs text-amber-600 font-medium block mt-1">
                            (Age Mismatch)
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!openTeamDetails?.members || openTeamDetails.members.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      {t('dashboard.no_members')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Manage Members Button */}
            <div className="mt-6 flex justify-end">
              <Button 
                variant="secondary"
                onClick={() => {
                  if (openTeamDetails) {
                    router.push(`/participants/teams/${openTeamDetails.id}/members`);
                  }
                }}
              >
                {t('contingent.manage')} {t('teams.team_members')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
