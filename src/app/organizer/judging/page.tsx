"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Download, Upload, Filter, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type JudgingSession = {
  id: number;
  contestName: string;
  eventName: string;
  submissionCount: number;
  judgedCount: number;
  status: "OPEN" | "CLOSED" | "PENDING";
  judges: string[];
  startDate: Date;
  endDate: Date | null;
  judgingMethod: "PANEL" | "CUMULATIVE" | "AVERAGE";
  templateName: string;
  hasResults: boolean;
};

// Mock data for judging sessions
const mockJudgingSessions: JudgingSession[] = [
  {
    id: 1,
    contestName: "Coding Challenge 2025",
    eventName: "Junior Division - Round 1",
    submissionCount: 45,
    judgedCount: 45,
    status: "CLOSED",
    judges: ["Ahmad Razali", "Siti Aminah", "David Wong"],
    startDate: new Date("2025-04-15"),
    endDate: new Date("2025-04-20"),
    judgingMethod: "AVERAGE",
    templateName: "Code Quality Assessment",
    hasResults: true,
  },
  {
    id: 2,
    contestName: "Web Development",
    eventName: "Senior Division - Finals",
    submissionCount: 28,
    judgedCount: 18,
    status: "OPEN",
    judges: ["Dr. Subramaniam", "Nurul Huda", "John Tan", "Aishah Mohammad"],
    startDate: new Date("2025-04-25"),
    endDate: null,
    judgingMethod: "PANEL",
    templateName: "Web Project Rubric",
    hasResults: false,
  },
  {
    id: 3,
    contestName: "Mobile App Innovation",
    eventName: "Open Category",
    submissionCount: 35,
    judgedCount: 0,
    status: "PENDING",
    judges: ["Prof. Lim", "Dr. Azizah", "Eng. Ravi"],
    startDate: new Date("2025-05-10"),
    endDate: null,
    judgingMethod: "CUMULATIVE",
    templateName: "Mobile App Evaluation",
    hasResults: false,
  },
  {
    id: 4,
    contestName: "AI Challenge",
    eventName: "Preliminary Round",
    submissionCount: 52,
    judgedCount: 52,
    status: "CLOSED",
    judges: ["Dr. Hafiz", "Prof. Chen", "Aisha Binti Abdullah"],
    startDate: new Date("2025-03-15"),
    endDate: new Date("2025-03-25"),
    judgingMethod: "AVERAGE",
    templateName: "AI Project Assessment",
    hasResults: true,
  },
  {
    id: 5,
    contestName: "Robotics Challenge",
    eventName: "School Teams",
    submissionCount: 24,
    judgedCount: 16,
    status: "OPEN",
    judges: ["Eng. Sarah", "Dr. Kumar", "Prof. Tan"],
    startDate: new Date("2025-04-22"),
    endDate: null,
    judgingMethod: "PANEL",
    templateName: "Robotics Performance Rubric",
    hasResults: false,
  },
];

export default function JudgingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Filter judging sessions based on search term and active tab
  const filteredSessions = mockJudgingSessions.filter((session) => {
    const matchesSearch = 
      session.contestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.judges.some(judge => judge.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "open") return matchesSearch && session.status === "OPEN";
    if (activeTab === "closed") return matchesSearch && session.status === "CLOSED";
    if (activeTab === "pending") return matchesSearch && session.status === "PENDING";
    return matchesSearch;
  });

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Judging Management" 
        description="Manage judging sessions for contests and events"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Download className="w-4 h-4" />
            <span>Export Results</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Link href="/organizer/judging-templates">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Manage Templates</span>
            </Link>
          </Button>
          <Button asChild className="h-9 gap-1">
            <Link href="/organizer/judging/new">
              <PlusCircle className="w-4 h-4" />
              <span>Create Session</span>
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Sessions</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          <JudgingSessionsTable sessions={filteredSessions} />
        </TabsContent>

        <TabsContent value="open" className="space-y-4 mt-4">
          <JudgingSessionsTable sessions={filteredSessions} />
        </TabsContent>

        <TabsContent value="closed" className="space-y-4 mt-4">
          <JudgingSessionsTable sessions={filteredSessions} />
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4 mt-4">
          <JudgingSessionsTable sessions={filteredSessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JudgingSessionsTable({ sessions }: { sessions: JudgingSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <Search className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium">No judging sessions found</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4 max-w-md">
          Try adjusting your search or filter to find what you're looking for
        </p>
        <Button asChild size="sm">
          <Link href="/organizer/judging/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            Create a new judging session
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contest & Event</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Judges</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const progressPercentage = session.submissionCount === 0 ? 0 : 
              Math.round((session.judgedCount / session.submissionCount) * 100);
            
            return (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="font-medium">{session.contestName}</div>
                  <div className="text-sm text-gray-500">{session.eventName}</div>
                  <div className="text-xs text-gray-400 mt-1">Template: {session.templateName}</div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{session.judgedCount} of {session.submissionCount} judged</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={
                      session.status === "OPEN" ? "bg-green-100 text-green-800" :
                      session.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }
                  >
                    {session.status}
                  </Badge>
                  {session.hasResults && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800">Has Results</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {session.judges.slice(0, 2).join(", ")}
                    {session.judges.length > 2 && (
                      <span className="text-gray-500"> +{session.judges.length - 2} more</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>Start: {format(session.startDate, "MMM d, yyyy")}</div>
                    {session.endDate ? (
                      <div>End: {format(session.endDate, "MMM d, yyyy")}</div>
                    ) : (
                      <div className="text-gray-500">End: Ongoing</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{session.judgingMethod}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Link href={`/organizer/judging/${session.id}`} className="flex items-center w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/organizer/judging/${session.id}/submissions`} className="flex items-center w-full">
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          View Submissions
                        </Link>
                      </DropdownMenuItem>
                      {session.hasResults && (
                        <DropdownMenuItem>
                          <Link href={`/organizer/judging/${session.id}/results`} className="flex items-center w-full">
                            <Award className="h-4 w-4 mr-2" />
                            View Results
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {session.status === "OPEN" && (
                        <DropdownMenuItem className="text-amber-600">Close Session</DropdownMenuItem>
                      )}
                      {session.status === "PENDING" && (
                        <DropdownMenuItem className="text-green-600">Open Session</DropdownMenuItem>
                      )}
                      {session.status === "CLOSED" && !session.hasResults && (
                        <DropdownMenuItem className="text-blue-600">Generate Results</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
