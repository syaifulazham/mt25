"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchIcon, FilterIcon, Eye, Edit, Scale, Trash2, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import DeleteContestButton from "./delete-contest-button";

// Helper function to get status badge color
function getStatusBadge(startDate: Date, endDate: Date) {
  const now = new Date();
  
  if (now < startDate) {
    return <Badge className="bg-blue-500">Upcoming</Badge>;
  } else if (now > endDate) {
    return <Badge className="bg-gray-500">Completed</Badge>;
  } else {
    return <Badge className="bg-green-500">Active</Badge>;
  }
}

// Helper function to get contest type display name
function getContestTypeDisplay(contestType: string) {
  const displayMap: Record<string, string> = {
    QUIZ: 'Quiz',
    CODING: 'Coding',
    STRUCTURE_BUILDING: 'Structure Building',
    FASTEST_COMPLETION: 'Fastest Completion',
    POSTER_PRESENTATION: 'Poster Presentation',
    SCIENCE_PROJECT: 'Science Project',
    ENGINEERING_DESIGN: 'Engineering Design',
    ANALYSIS_CHALLENGE: 'Analysis Challenge'
  };
  
  return displayMap[contestType] || contestType;
}

// Helper function to get participation mode badge
function getParticipationModeBadge(participationMode: string) {
  if (participationMode === 'TEAM') {
    return <Badge variant="outline" className="border-orange-500 text-orange-500">Team</Badge>;
  } else {
    return <Badge variant="outline" className="border-purple-500 text-purple-500">Individual</Badge>;
  }
}

// Helper function to determine contest status
function getContestStatus(startDate: Date, endDate: Date): 'active' | 'upcoming' | 'completed' {
  const now = new Date();
  
  if (now < startDate) {
    return 'upcoming';
  } else if (now > endDate) {
    return 'completed';
  } else {
    return 'active';
  }
}

// Define Contest type
interface Contest {
  id: number;
  code?: string | null;
  name: string;
  contestType: string;
  participation_mode: string;
  maxMembersPerTeam?: number | null;
  startDate: Date;
  endDate: Date;
  targetgroups: {
    id: number;
    name: string;
  }[];
  theme?: {
    id: number;
    name: string;
    logoPath?: string | null;
  } | null;
}

interface ContestsTableProps {
  initialContests: Contest[];
}

export default function ContestsTable({ initialContests }: ContestsTableProps) {
  // State for filters and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [contestTypeFilter, setContestTypeFilter] = useState("");
  const [participationModeFilter, setParticipationModeFilter] = useState("");
  const [sortColumn, setSortColumn] = useState("startDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filteredContests, setFilteredContests] = useState<Contest[]>(initialContests);
  
  // Apply filters and sorting when any filter or sort state changes
  useEffect(() => {
    // Filter contests based on current filter settings
    let result = initialContests.filter(contest => {
      // Apply search filter
      if (searchTerm && !contest.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !(contest.code || "").toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Apply contest type filter
      if (contestTypeFilter && contest.contestType !== contestTypeFilter) {
        return false;
      }
      
      // Apply participation mode filter
      if (participationModeFilter && contest.participation_mode !== participationModeFilter) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      switch (sortColumn) {
        case "code":
          valueA = a.code || `CNT-${a.id}`;
          valueB = b.code || `CNT-${b.id}`;
          break;
        case "name":
          valueA = a.name;
          valueB = b.name;
          break;
        case "contestType":
          valueA = getContestTypeDisplay(a.contestType);
          valueB = getContestTypeDisplay(b.contestType);
          break;
        case "participation_mode":
          valueA = a.participation_mode;
          valueB = b.participation_mode;
          break;
        case "targetgroups":
          valueA = a.targetgroups.length > 0 ? a.targetgroups.map(tg => tg.name).join(", ") : "";
          valueB = b.targetgroups.length > 0 ? b.targetgroups.map(tg => tg.name).join(", ") : "";
          break;
        case "theme":
          valueA = a.theme?.name || "";
          valueB = b.theme?.name || "";
          break;
        case "startDate":
        default:
          valueA = new Date(a.startDate);
          valueB = new Date(b.startDate);
          break;
      }
      
      // Compare values based on sort direction
      if (sortDirection === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredContests(result);
  }, [initialContests, searchTerm, contestTypeFilter, participationModeFilter, sortColumn, sortDirection]);
  
  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setContestTypeFilter("");
    setParticipationModeFilter("");
    setSortColumn("startDate");
    setSortDirection("desc");
  };
  
  // Get sort icon for column headers
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    
    return sortDirection === "asc" 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };
  
  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search contests..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-[200px]">
          <select 
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={contestTypeFilter}
            onChange={(e) => setContestTypeFilter(e.target.value)}
          >
            <option value="">All Contest Types</option>
            <option value="QUIZ">Quiz</option>
            <option value="CODING">Coding</option>
            <option value="STRUCTURE_BUILDING">Structure Building</option>
            <option value="FASTEST_COMPLETION">Fastest Completion</option>
            <option value="POSTER_PRESENTATION">Poster Presentation</option>
            <option value="SCIENCE_PROJECT">Science Project</option>
            <option value="ENGINEERING_DESIGN">Engineering Design</option>
            <option value="ANALYSIS_CHALLENGE">Analysis Challenge</option>
          </select>
        </div>

        <div className="w-[200px]">
          <select 
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={participationModeFilter}
            onChange={(e) => setParticipationModeFilter(e.target.value)}
          >
            <option value="">All Participation Modes</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="TEAM">Team</option>
          </select>
        </div>
        <Button variant="default" className="flex items-center gap-2" onClick={resetFilters}>
          <FilterIcon className="h-4 w-4" />
          Reset Filters
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort("code")}>
                <div className="flex items-center">
                  Code {getSortIcon("code")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center">
                  Name {getSortIcon("name")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("contestType")}>
                <div className="flex items-center">
                  Type {getSortIcon("contestType")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("participation_mode")}>
                <div className="flex items-center">
                  Participation {getSortIcon("participation_mode")}
                </div>
              </TableHead>

              <TableHead className="cursor-pointer" onClick={() => handleSort("theme")}>
                <div className="flex items-center">
                  Theme {getSortIcon("theme")}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No contests found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredContests.map((contest) => (
                <TableRow key={contest.id}>
                  <TableCell className="font-medium">{contest.code || `CNT-${contest.id}`}</TableCell>
                  <TableCell>
                    <div>
                      {contest.name}
                      <div className="mt-1 text-xs italic text-muted-foreground">
                        {contest.targetgroups.length > 0 
                          ? contest.targetgroups.map(tg => tg.name).join(", ") 
                          : 'No target group'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getContestTypeDisplay(contest.contestType)}</TableCell>
                  <TableCell>
                    {getParticipationModeBadge(contest.participation_mode || 'INDIVIDUAL')} 
                    {contest.participation_mode === 'TEAM' && contest.maxMembersPerTeam && ` of ${contest.maxMembersPerTeam}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {contest.theme?.logoPath && (
                        <div className="h-6 w-6 relative overflow-hidden rounded-sm">
                          <Image 
                            src={contest.theme.logoPath} 
                            alt={contest.theme?.name || "Theme logo"} 
                            width={24} 
                            height={24}
                            className="object-contain"
                          />
                        </div>
                      )}
                      <span>{contest.theme?.name || "No theme"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/organizer/contests/${contest.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Contest</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/organizer/contests/${contest.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Contest</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/organizer/contests/${contest.id}/judging-scheme`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                                <Scale className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Judging Scheme</p>
                          </TooltipContent>
                        </Tooltip>

                        <DeleteContestButton id={contest.id} name={contest.name} />
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {filteredContests.length} of {initialContests.length} contests
      </div>
    </div>
  );
}
