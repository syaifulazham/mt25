"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Award, ChevronLeft, ChevronRight, Plus, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface Contestant {
  id: number;
  name: string;
  gender: string | null;
  ic: string | null;
  phoneNumber: string | null;
  email: string | null;
  edu_level: string;
  class_grade: string | null;
  class_name: string | null;
  is_ppki?: boolean; // true/false for PPKI status
  contests: Array<{
    id: number;
    contest: {
      id: number;
      name: string;
      startDate?: Date;
      endDate?: Date;
    };
  }>;
}

interface PaginatedContestantsListProps {
  contestants: Contestant[];
  pageSize?: number;
}

export function PaginatedContestantsList({ contestants, pageSize = 5 }: PaginatedContestantsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContestants, setFilteredContestants] = useState(contestants);
  
  // Update filtered contestants when search term changes
  useEffect(() => {
    const filtered = contestants.filter(contestant => 
      contestant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contestant.ic && contestant.ic.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredContestants(filtered);
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, contestants]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredContestants.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentContestants = filteredContestants.slice(startIndex, endIndex);
  
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
            placeholder="Search by name or ID"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {filteredContestants.length > 0 ? (
        <>
          <div className="space-y-4">
            {currentContestants.map((contestant) => (
              <Card 
                key={contestant.id} 
                className={`overflow-hidden border-l-4 ${contestant.is_ppki 
                  ? 'border-l-amber-500 bg-amber-50/50' 
                  : 'border-l-primary'}`}
              >
                <CardHeader className="py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{contestant.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <CardTitle className="text-base">{contestant.name}</CardTitle>
                        {contestant.is_ppki && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            PPKI
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-col gap-1">
                        <div>
                          ID: {contestant.ic || 'N/A'} 
                          {contestant.gender && (
                            <span className="ml-2">
                              Gender: {contestant.gender === 'M' ? 'Male' : 'Female'}
                            </span>
                          )}
                        </div>
                        {contestant.class_grade && contestant.class_name && (
                          <div>
                            {contestant.edu_level?.toLowerCase() === 'sekolah rendah' ? 'Tahun' : 
                             contestant.edu_level?.toLowerCase() === 'sekolah menengah' ? 'Tingkatan' : 'Class'}: 
                            {contestant.class_grade}{contestant.class_name && ` - ${contestant.class_name}`}
                          </div>
                        )}
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
              Showing {startIndex + 1}-{Math.min(endIndex, filteredContestants.length)} of {filteredContestants.length} contestants
              {searchTerm && contestants.length !== filteredContestants.length && (
                <span className="ml-1">(filtered from {contestants.length})</span>
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
          <h3 className="text-lg font-medium">No Contestants</h3>
          <p className="text-muted-foreground mb-4">
            This contingent doesn't have any contestants yet.
          </p>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
