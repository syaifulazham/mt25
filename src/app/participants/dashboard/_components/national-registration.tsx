"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
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
import { AlertTriangle, Trophy, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import QRCodeButton from "./qr-code-button";

interface NationalRegistrationProps {
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
  participant?: {
    id: number;
    name: string;
    email?: string;
    phoneNumber?: string;
  };
}

interface IndependentManager {
  id: number;
  name: string;
  email?: string;
  phoneNumber?: string;
}

interface NationalTeam {
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
  independentManagers?: IndependentManager[];
}

export default function NationalRegistrationSection({ participantId }: NationalRegistrationProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [teams, setTeams] = useState<NationalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTeamDetails, setOpenTeamDetails] = useState<NationalTeam | null>(null);

  // Fetch national registered teams on component mount
  useEffect(() => {
    const fetchNationalTeams = async () => {
      try {
        const response = await fetch(`/api/participants/national-registration?participantId=${participantId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch national registration data");
        }
        const data = await response.json();
        console.log("Received national teams data:", data);
        // Extract the teams array from the response object
        setTeams(data.teams || []);
        setLoading(false);
      } catch (err) {
        setError("Error loading national registration data");
        setLoading(false);
        console.error("Error fetching national teams:", err);
      }
    };

    fetchNationalTeams();
  }, [participantId]);

  // Handle accepting a team registration
  const handleAccept = async (teamId: number) => {
    try {
      const response = await fetch("/api/participants/national-registration/accept", {
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
  const handleViewMembers = async (team: NationalTeam) => {
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

  const handleDownloadList = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/participants/national-registration/download?participantId=${participantId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download list');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'national-registration-list.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading list:', error);
      alert('Failed to download list. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg mb-6 border border-purple-200">
        <div className="flex items-center mb-3">
          <Trophy className="h-5 w-5 mr-2 text-purple-600" />
          <h2 className="text-sm font-medium text-purple-900">Final Stage (National) Registration</h2>
        </div>
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg mb-6 border border-purple-200">
        <div className="flex items-center mb-3">
          <Trophy className="h-5 w-5 mr-2 text-purple-600" />
          <h2 className="text-sm font-medium text-purple-900">Final Stage (National) Registration</h2>
        </div>
        <div className="p-4 text-center text-red-500">{error}</div>
      </div>
    );
  }

  // Don't render if no teams found
  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg mb-6 border border-purple-200">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-purple-600" />
          <h2 className="text-sm font-medium text-purple-900">Final Stage (National) Registration</h2>
        </div>
        <div className="flex gap-2">
          <QRCodeButton />
          <Button
            onClick={handleDownloadList}
            disabled={isLoading || teams.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isLoading ? 'Generating...' : 'Download List'}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-purple-100/50">
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
              <TableRow key={team.id} className="hover:bg-purple-100/30">
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
                  {/* Display both managerTeams and independentManagers */}
                  {((team.managerTeams && team.managerTeams.length > 0) || (team.independentManagers && team.independentManagers.length > 0))
                    ? <div className="flex flex-col">
                        {/* Display team managers */}
                        {team.managerTeams && team.managerTeams.map((mt, index) => (
                          <div key={`team-manager-${mt.id}`} className="mb-1">
                            <div className="font-medium cursor-pointer hover:text-purple-600 hover:underline" 
                                 onClick={() => mt.participant?.id && router.push(`/participants/managers/${mt.participant.id}/edit`)}>
                              {index + 1}. {mt.participant?.name}
                            </div>
                            <div className="text-xs text-muted-foreground pl-3">
                              {mt.participant?.email || '-'}
                            </div>
                          </div>
                        ))}
                        
                        {/* Display independent managers */}
                        {team.independentManagers && team.independentManagers.map((manager: IndependentManager, index: number) => (
                          <div key={`independent-manager-${manager.id}`} className="mb-1">
                            <div className="font-medium cursor-pointer hover:text-purple-600 hover:underline"
                                 onClick={() => manager.id && router.push(`/participants/managers/${manager.id}/edit`)}>
                              {(team.managerTeams?.length || 0) + index + 1}. {manager.name}
                            </div>
                            <div className="text-xs text-muted-foreground pl-3">
                              {manager.email || '-'}
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
                      className="hover:bg-purple-100"
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
                    <TableCell colSpan={2} className="text-center py-4">
                      {t('dashboard.no_members')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
