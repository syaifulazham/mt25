"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Trophy,
  Users,
  ChevronLeft,
  User,
  Clock,
  Edit,
  Trash2,
  CalendarIcon,
  Building,
  School,
  Info,
  Mail,
  Upload,
  FileText,
  Eye,
  AlertTriangle
} from "lucide-react";
import EventRegistrations from "./event-registrations";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Tabs removed as requested
import { Separator } from "@/components/ui/separator";

interface TeamMember {
  id: number;
  contestantId: number;
  contestantName: string;
  status: string;
  joinDate: string;
  icNumber?: string;
  email?: string;
  gender?: string;
  educationLevel?: string;
  class?: string;
}

interface Team {
  id: number;
  name: string;
  hashcode: string;
  description?: string;
  team_email?: string | null;
  evidence_doc?: string | null;
  evidence_submitteddate?: string | null;
  status: string;
  contestId: number;
  contestName: string;
  contingentId: number;
  contingentName: string;
  institutionName?: string;
  institutionType?: string;
  members: TeamMember[];
  maxMembers: number;
  contestMaxMembers?: number; // Max members from contest configuration
  isOwner: boolean;
  isManager?: boolean;
  minAge?: number;  // Min age from the contest
  maxAge?: number;  // Max age from the contest
  createdAt: string;
  updatedAt: string;
}

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [teamEmail, setTeamEmail] = useState("");
  const [viewDocDialogOpen, setViewDocDialogOpen] = useState(false);
  const [documentRemovalDialogOpen, setDocumentRemovalDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch the team details
  useEffect(() => {
    const fetchTeam = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/participants/teams/${params.id}?t=${new Date().getTime()}`, {
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-store, must-revalidate',
            'Cache': 'no-cache'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch team details");
        }
        
        const data = await response.json();
        setTeam(data);
      } catch (error) {
        console.error("Error fetching team details:", error);
        toast.error("Failed to load team details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeam();
  }, [session, params.id]);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file type (PDF or images)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF or image file (JPEG, PNG).');
        return;
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Handle evidence upload
  const handleEvidenceUpload = async () => {
    if (!selectedFile || !team) return;
    
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('teamId', team.id.toString());
      
      const response = await fetch('/api/upload/evidence-doc', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload evidence document');
      }
      
      const data = await response.json();
      
      // Update the team state with the new document info
      setTeam(prev => prev ? {
        ...prev,
        evidence_doc: data.documentUrl,
        evidence_submitteddate: new Date().toISOString()
      } : null);
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      toast.success('Evidence document uploaded successfully');
    } catch (error) {
      console.error('Error uploading evidence document:', error);
      toast.error('Failed to upload evidence document');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle evidence removal
  const handleRemoveEvidence = async () => {
    if (!team) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/participants/teams/${team.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evidence_doc: null,
          evidence_submitteddate: null
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove evidence document');
      }
      
      // Update the team state to remove document info
      setTeam(prev => prev ? {
        ...prev,
        evidence_doc: null,
        evidence_submitteddate: null
      } : null);
      
      setDocumentRemovalDialogOpen(false);
      toast.success('Evidence document removed successfully');
    } catch (error) {
      console.error('Error removing evidence document:', error);
      toast.error('Failed to remove evidence document');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle email update
  const handleEmailUpdate = async () => {
    if (!team) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/participants/teams/${team.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_email: teamEmail
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update team email');
      }
      
      // Update the team state with the new email
      setTeam(prev => prev ? {
        ...prev,
        team_email: teamEmail
      } : null);
      
      toast.success('Team email updated successfully');
    } catch (error) {
      console.error('Error updating team email:', error);
      toast.error('Failed to update team email');
    } finally {
      setIsUpdating(false);
    }
  };

  // Set initial email state when team data is loaded
  useEffect(() => {
    if (team?.team_email) {
      setTeamEmail(team.team_email);
    }
  }, [team?.team_email]);

  // Handle team deletion
  const handleDeleteTeam = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/participants/teams/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete team");
      }
      
      toast.success("Team deleted successfully");
      setDeleteDialogOpen(false);
      router.push("/participants/teams");
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error(error.message || "Failed to delete team");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-600 border-green-500/20';
      case 'INACTIVE':
        return 'bg-gray-500/20 text-gray-600 border-gray-500/20';
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-600 border-amber-500/20';
      default:
        return 'bg-blue-500/20 text-blue-600 border-blue-500/20';
    }
  };
  
  // Get gender badge color
  const getGenderColor = (gender?: string) => {
    if (!gender) return 'bg-gray-500/20 text-gray-600 border-gray-500/20';
    
    switch (gender.toUpperCase()) {
      case 'MALE':
        return 'bg-blue-500/20 text-blue-600 border-blue-500/20';
      case 'FEMALE':
        return 'bg-pink-500/20 text-pink-600 border-pink-500/20';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500/20';
    }
  };
  
  // Format class information based on education level and class data
  const formatClassInfo = (member: TeamMember) => {
    // First, check if we have any data
    if (!member.educationLevel) return '—';
    
    // Get base education level for display
    const educationDisplay = getEducationLevelText(member.educationLevel);
    
    // Get the education level in lowercase for comparison
    const eduLevel = member.educationLevel.toLowerCase();
    
    // If we have the class data directly from the API, use it
    if (member.class) {
      // Determine the prefix based on education level
      let prefix = '';
      if (eduLevel === 'sekolah rendah') {
        prefix = 'Tahun';
      } else if (eduLevel === 'sekolah menengah') {
        prefix = 'Tingkatan';
      } else {
        // For other education levels, just use the translated education level
        return educationDisplay;
      }
      
      // Concatenate prefix with the class data
      return `${prefix} ${member.class}`;
    }
    
    // If no class data is available, return the education level
    return educationDisplay;
  };
  
  // Original education level formatter
  const getEducationLevelText = (level: string) => {
    if (!level) return '—';
    
    switch (level?.toLowerCase()) {
      case 'sekolah rendah':
        return 'Primary School';
      case 'sekolah menengah':
        return 'Secondary School';
      case 'belia':
        return 'Youth';
      default:
        return level;
    }
  };
  
  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link href="/participants/teams">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('teams.back_to_teams')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t('teams.details')}</h1>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !team ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t('teams.not_found')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t('teams.not_found_description')}
            </p>
            <Button asChild>
              <Link href="/participants/teams">
                {t('teams.return_to_teams')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{t('teams.contest_participation')}</CardTitle>
                  <CardDescription>{team.hashcode}</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  {team.evidence_doc && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {t('teams.evidence_submitted')}
                    </Badge>
                  )}
                  <Badge className={`${getStatusColor(team.status)} w-fit`}>
                    {team.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('teams.team_info')}</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground block">{t('teams.contest')}</span>
                      <span className="font-medium">{team.contestName}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground block">{t('teams.team_size')}</span>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{team.members.length} / {team.contestMaxMembers || team.maxMembers} members</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('teams.additional_info')}</h3>
                  <div className="space-y-3">
                    {team.description && (
                      <div>
                        <span className="text-sm text-muted-foreground block">{t('teams.description')}</span>
                        <span className="font-medium">{team.description}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-muted-foreground block">{t('teams.created_on')}</span>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{formatDate(team.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground block">{t('teams.last_updated')}</span>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{formatDate(team.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
              {team.isOwner && (
                <>
                  <Button variant="outline" asChild>
                    <Link href={`/participants/teams/${team.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      {t('teams.edit_team')}
                    </Link>
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('teams.delete_team')}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>

          {/* Team Contact and Evidence Section */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle>{t('teams.contact_evidence')}</CardTitle>
              <CardDescription>
                {t('teams.contact_evidence_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Email Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('teams.team_email')}</h3>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <input 
                        type="email" 
                        value={teamEmail} 
                        onChange={(e) => setTeamEmail(e.target.value)}
                        placeholder="team@example.com"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('teams.team_email_description')}</p>
                    <Button 
                      size="sm" 
                      onClick={handleEmailUpdate} 
                      disabled={isUpdating || teamEmail === team.team_email}
                    >
                      {isUpdating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : (
                        t('teams.update_email')
                      )}
                    </Button>
                  </div>
                </div>

                {/* Evidence Document Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('teams.evidence_document')}</h3>
                  <div className="border rounded-md p-4">
                    {/* Show existing document if available */}
                    {team.evidence_doc && !selectedFile ? (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span className="text-sm">{t('teams.document_uploaded_on')} {team.evidence_submitteddate ? new Date(team.evidence_submitteddate).toLocaleDateString() : t('teams.na')}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Dialog open={viewDocDialogOpen} onOpenChange={setViewDocDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-3 w-3" />
                                {t('teams.view_document')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                              <DialogHeader>
                                <DialogTitle>{t('teams.evidence_document')}</DialogTitle>
                                <DialogDescription>
                                  {t('teams.uploaded_on')} {team.evidence_submitteddate ? new Date(team.evidence_submitteddate).toLocaleDateString() : t('teams.na')}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex-1 overflow-hidden rounded-md border">
                                {team.evidence_doc?.toLowerCase().endsWith('.pdf') ? (
                                  <iframe 
                                    src={team.evidence_doc} 
                                    className="w-full h-full" 
                                    title="Evidence Document"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full bg-gray-100">
                                    <img 
                                      src={team.evidence_doc?.startsWith('/') ? team.evidence_doc : `/${team.evidence_doc}`} 
                                      alt="Evidence Document" 
                                      className="max-w-full max-h-full object-contain"
                                      onError={(e) => {
                                        console.error("Image failed to load:", team.evidence_doc);
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/images/document-placeholder.png";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              if (fileInputRef.current) fileInputRef.current.click();
                            }}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            {t('teams.replace')}
                          </Button>
                          
                          <Button
                            variant="destructive" 
                            size="sm"
                            onClick={() => setDocumentRemovalDialogOpen(true)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {t('teams.remove')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {selectedFile ? (
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-5 w-5 text-green-500" />
                              <span className="text-sm">{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</span>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="secondary" 
                                size="sm"
                                onClick={() => {
                                  setSelectedFile(null);
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                              >
                                {t('teams.change_file')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleEvidenceUpload}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                  </>
                                ) : (
                                  t('teams.upload')
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md hover:border-primary cursor-pointer"
                            onClick={() => {
                              if (fileInputRef.current) fileInputRef.current.click();
                            }}
                          >
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">{t('teams.click_to_upload')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('teams.file_requirements')}</p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="evidence-doc"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-start space-x-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <p className="text-xs">{t('teams.evidence_requirements')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>{t('teams.team_members')}</CardTitle>
                  <CardDescription>
                    {t('teams.team_members_description')}
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/participants/teams/${team.id}/members`}>
                    <Users className="mr-2 h-4 w-4" />
                    {t('teams.manage_members')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {team.members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">{t('teams.no_members_yet')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    {t('teams.no_members_description')}
                  </p>
                  <Button asChild>
                    <Link href={`/participants/teams/${team.id}/members`}>
                      <Users className="mr-2 h-4 w-4" />
                      {t('teams.add_members')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[300px] rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('teams.member_name')}</TableHead>
                        <TableHead>{t('teams.member_ic')}</TableHead>
                        <TableHead>{t('teams.member_gender')}</TableHead>
                        <TableHead>{t('teams.member_education')}</TableHead>
                        <TableHead>{t('teams.member_class')}</TableHead>
                        <TableHead>{t('teams.member_status')}</TableHead>
                        <TableHead>{t('teams.member_joined')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.contestantName}</TableCell>
                          <TableCell>{member.icNumber || "—"}</TableCell>
                          <TableCell>
                            {member.gender ? (
                              <Badge className={getGenderColor(member.gender)}>
                                {member.gender.toUpperCase()}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{getEducationLevelText(member.educationLevel || '')}</TableCell>
                          <TableCell>{formatClassInfo(member)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(member.status)}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(member.joinDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          {/* Event Registration Section */}
          {team && <EventRegistrations teamId={team.id} />}
          {/* Delete confirmation dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('teams.delete_team')}</DialogTitle>
                <DialogDescription>
                  {t('teams.delete_confirmation').replace('{teamName}', team?.name || '')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTeam}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    t('teams.delete_team')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Document removal confirmation dialog */}
          <Dialog open={documentRemovalDialogOpen} onOpenChange={setDocumentRemovalDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('teams.remove_evidence')}</DialogTitle>
                <DialogDescription>
                  {t('teams.remove_evidence_confirmation')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDocumentRemovalDialogOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemoveEvidence}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Removing...
                    </>
                  ) : (
                    t('teams.remove_document')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
