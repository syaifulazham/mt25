"use client";

import { useState, useEffect } from "react";
import { Survey } from "../survey-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Contestant {
  id: number;
  name: string;
  contingentName: string;
  assigned: boolean;
}

interface ContestantAssignmentProps {
  survey: Survey;
  onBack: () => void;
  onSuccess: () => void;
}

export function ContestantAssignment({ survey, onBack, onSuccess }: ContestantAssignmentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [filteredContestants, setFilteredContestants] = useState<Contestant[]>([]);
  const [selectedContestants, setSelectedContestants] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch contestants and their assignment status for this survey
  useEffect(() => {
    async function fetchContestants() {
      try {
        // Get all contestants
        const contestantsResponse = await fetch('/api/contestants');
        if (!contestantsResponse.ok) {
          throw new Error('Failed to fetch contestants');
        }
        const contestantsData = await contestantsResponse.json();

        // Get assigned contestants for this survey
        const assignedResponse = await fetch(`/api/survey/${survey.id}/contestants`);
        if (!assignedResponse.ok) {
          throw new Error('Failed to fetch assigned contestants');
        }
        const assignedData = await assignedResponse.json();
        
        // Create a set of assigned contestant IDs for quick lookup
        // Note: With raw SQL, we're now getting numeric strings so convert to numbers
        const assignedIds = new Set(
          assignedData.map((a: any) => Number(a.contestantId))
        );
        
        // Map contestants with assignment status
        const mappedContestants = contestantsData.map((c: any) => ({
          id: c.id,
          name: c.name || `Contestant #${c.id}`,
          // If using raw SQL we may need to get contingent name differently
          contingentName: c.contingent?.name || 'No contingent',
          assigned: assignedIds.has(Number(c.id))
        }));

        setContestants(mappedContestants);
        
        // Initialize selected contestants with those already assigned
        const initialSelected = new Set<number>();
        assignedData.forEach((a: any) => {
          initialSelected.add(Number(a.contestantId));
        });
        setSelectedContestants(initialSelected);
        
      } catch (err) {
        console.error('Error fetching contestants:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }

    fetchContestants();
  }, [survey.id]);

  // Filter and paginate contestants when search query changes
  useEffect(() => {
    const filtered = contestants.filter(
      (contestant) =>
        contestant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contestant.contingentName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredContestants(filtered);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)));
    setPage(1); // Reset to first page when filtering
  }, [searchQuery, contestants]);

  const getCurrentPageItems = () => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredContestants.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set(selectedContestants);
    getCurrentPageItems().forEach((contestant) => {
      if (checked) {
        newSelected.add(contestant.id);
      } else {
        newSelected.delete(contestant.id);
      }
    });
    setSelectedContestants(newSelected);
  };

  const handleSelectOne = (contestantId: number, checked: boolean) => {
    const newSelected = new Set(selectedContestants);
    if (checked) {
      newSelected.add(contestantId);
    } else {
      newSelected.delete(contestantId);
    }
    setSelectedContestants(newSelected);
  };

  const areAllCurrentPageSelected = () => {
    return getCurrentPageItems().every((contestant) => 
      selectedContestants.has(contestant.id)
    );
  };

  const handleSaveAssignments = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/survey/${survey.id}/contestants`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contestantIds: Array.from(selectedContestants),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contestant assignments');
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error saving contestant assignments:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          Assign Contestants to &quot;{survey.name}&quot;
        </CardTitle>
        <CardDescription>
          Select contestants who should complete this survey
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contestants or contingents..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedContestants.size} selected
          </div>
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={areAllCurrentPageSelected()}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contingent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getCurrentPageItems().map((contestant) => (
                <TableRow key={contestant.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedContestants.has(contestant.id)}
                      onCheckedChange={(checked) => 
                        handleSelectOne(contestant.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{contestant.name}</TableCell>
                  <TableCell>{contestant.contingentName}</TableCell>
                </TableRow>
              ))}
              
              {getCurrentPageItems().length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No contestants found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSaveAssignments} 
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
          )}
          Save Assignments
        </Button>
      </CardFooter>
    </Card>
  );
}
