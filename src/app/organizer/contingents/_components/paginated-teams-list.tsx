"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, FileQuestion, FileText, Image, Plus, Search, ShieldAlert, Users } from "lucide-react";

// Evidence Document Viewer component
const EvidenceDocumentViewer = ({ documentPath }: { documentPath: string }) => {
  const fileExtension = documentPath.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
  
  return (
    <Dialog>
      <DialogTrigger className="flex items-center justify-center">
        {isPdf ? (
          <FileText className="h-5 w-5 text-blue-600 cursor-pointer hover:text-blue-800" />
        ) : isImage ? (
          <Image className="h-5 w-5 text-green-600 cursor-pointer hover:text-green-800" />
        ) : (
          <FileQuestion className="h-5 w-5 text-amber-600 cursor-pointer hover:text-amber-800" />
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Evidence Document</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(80vh-80px)]">
          {isPdf ? (
            <iframe 
              src={documentPath} 
              className="w-full h-[70vh]" 
              title="PDF Document"
            />
          ) : isImage ? (
            <img 
              src={documentPath} 
              alt="Evidence Document" 
              className="max-w-full max-h-[70vh] mx-auto"
            />
          ) : (
            <div className="p-4 text-center">
              <p>Unsupported document format. <a href={documentPath} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Click here to download</a></p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface Team {
  id: number;
  name: string;
  hashcode: string;
  description: string | null;
  status: string;
  createdAt: Date;
  evidence_doc: string | null;
  contest: {
    id: number;
    name: string;
  };
  _count: {
    members: number;
  };
}

interface PaginatedTeamsListProps {
  teams: Team[];
  pageSize?: number;
}

export function PaginatedTeamsList({ teams, pageSize = 5 }: PaginatedTeamsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeams, setFilteredTeams] = useState(teams);
  
  // Update filtered teams when search term changes
  useEffect(() => {
    const filtered = teams.filter(team => 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.hashcode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTeams(filtered);
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, teams]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredTeams.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTeams = filteredTeams.slice(startIndex, endIndex);
  
  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  return (
    <>
      {/* Search box */}
      <div className="mb-4 relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by team name or code"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredTeams.length > 0 ? (
        <>
          <div className="space-y-4">
            {currentTeams.map((team) => (
              <Card key={team.id} className="overflow-hidden border-l-4 border-l-blue-500">
                <CardHeader className="py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 bg-blue-100">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {team.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          <Badge 
                            variant="secondary"
                            className={`text-xs ${team.status === "ACTIVE" ? "bg-green-100 text-green-800" : team.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : ""}`}
                          >
                            {team.status}
                          </Badge>
                        </div>
                        {team.evidence_doc && (
                          <EvidenceDocumentViewer documentPath={team.evidence_doc} />
                        )}
                      </div>
                      <CardDescription className="flex flex-col gap-1">
                        <div>Code: {team.hashcode}</div>
                        <div>Members: {team._count.members}</div>
                        <div>Contest: {team.contest.name}</div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-6 border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredTeams.length)} of {filteredTeams.length} teams
              {searchTerm && teams.length !== filteredTeams.length && (
                <span className="ml-1">(filtered from {teams.length})</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToPreviousPage} 
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToNextPage} 
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Teams</h3>
          <p className="text-muted-foreground mb-4">
            This contingent doesn't have any teams yet.
          </p>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
