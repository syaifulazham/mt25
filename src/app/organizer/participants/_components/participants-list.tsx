"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  School,
  Users,
  Phone,
  Mail,
  CalendarDays
} from "lucide-react";

interface Contingent {
  id: number;
  name: string;
  school?: {
    id: number;
    name: string;
  } | null;
  higherInstitution?: {
    id: number;
    name: string;
  } | null;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  phoneNumber: string | null;
  username: string | null;
  createdAt: Date;
  contingents: Contingent[];
}

interface ParticipantsListProps {
  participants: Participant[];
  totalCount: number;
  pageSize: number;
}

export function ParticipantsList({ 
  participants, 
  totalCount, 
  pageSize 
}: ParticipantsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedParticipants, setPaginatedParticipants] = useState<Participant[]>([]);

  // Filter participants based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredParticipants(participants);
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const filtered = participants.filter(
        (participant) =>
          participant.name?.toLowerCase().includes(lowerSearchTerm) ||
          participant.email?.toLowerCase().includes(lowerSearchTerm) ||
          participant.phoneNumber?.toLowerCase().includes(lowerSearchTerm) ||
          participant.contingents.some(contingent => 
            contingent.name.toLowerCase().includes(lowerSearchTerm) ||
            contingent.school?.name.toLowerCase().includes(lowerSearchTerm) ||
            contingent.higherInstitution?.name.toLowerCase().includes(lowerSearchTerm)
          )
      );
      setFilteredParticipants(filtered);
    }
    
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, participants]);

  // Calculate total pages
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredParticipants.length / pageSize)));
  }, [filteredParticipants, pageSize]);

  // Paginate the filtered participants
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setPaginatedParticipants(filteredParticipants.slice(startIndex, endIndex));
  }, [filteredParticipants, currentPage, pageSize]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between p-4 border-b">
        <div className="flex gap-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, contingent..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" title="Filter">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div>
            {filteredParticipants.length > 0 ? (
              <>
                Showing <span className="font-medium">
                  {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredParticipants.length)}
                </span> of{" "}
                <span className="font-medium">{filteredParticipants.length}</span> participants
              </>
            ) : (
              <>No participants found</>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {paginatedParticipants.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Contingent</TableHead>
              <TableHead>Registered On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedParticipants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/avatars/avatar-${participant.id % 10}.png`} />
                    <AvatarFallback>{participant.name?.substring(0, 2) || participant.username?.substring(0, 2) || "??"}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/organizer/participants/${participant.id}`} className="hover:underline">
                    {participant.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {participant.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {participant.phoneNumber || "N/A"}
                  </div>
                </TableCell>
                <TableCell>
                  {participant.contingents && participant.contingents.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {participant.contingents[0].school ? (
                        <School className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-purple-500" />
                      )}
                      <Link 
                        href={`/organizer/contingents/${participant.contingents[0].id}`}
                        className="hover:underline"
                      >
                        {participant.contingents[0].name}
                      </Link>
                      {participant.contingents.length > 1 && (
                        <Badge variant="outline" className="ml-1 text-xs">
                          +{participant.contingents.length - 1}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
                      No Contingent
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(participant.createdAt), "PPP")}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/organizer/participants/${participant.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No participants found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "There are no participants in the system yet."}
          </p>
          {!searchTerm && (
            <Button>
              Add Participant
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
