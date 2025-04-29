"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Download, Upload, Filter, Mail, UserPlus } from "lucide-react";
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
import { MoreHorizontal } from "lucide-react";

type Participant = {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  icNumber: string;
  contingentName: string;
  schoolName: string;
  registrationDate: Date;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  educationLevel: "PRIMARY" | "SECONDARY" | "HIGHER";
  contestantsCount: number;
};

// Mock data for participants
const mockParticipants: Participant[] = [
  {
    id: 1,
    name: "Ahmad Bin Abdullah",
    email: "ahmad@example.com",
    phoneNumber: "0123456789",
    icNumber: "960123145678",
    contingentName: "Team Cyber Warriors",
    schoolName: "SMK Seri Puteri",
    registrationDate: new Date("2025-01-15"),
    status: "ACTIVE",
    educationLevel: "SECONDARY",
    contestantsCount: 5,
  },
  {
    id: 2,
    name: "Siti Binti Mohamed",
    email: "siti@example.com",
    phoneNumber: "0198765432",
    icNumber: "990307089876",
    contingentName: "Digital Innovators",
    schoolName: "SK Bukit Damansara",
    registrationDate: new Date("2025-02-10"),
    status: "ACTIVE",
    educationLevel: "PRIMARY",
    contestantsCount: 3,
  },
  {
    id: 3,
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    phoneNumber: "0167890123",
    icNumber: "970525103421",
    contingentName: "Tech Titans",
    schoolName: "SMK Damansara Jaya",
    registrationDate: new Date("2025-02-28"),
    status: "PENDING",
    educationLevel: "SECONDARY",
    contestantsCount: 0,
  },
  {
    id: 4,
    name: "Nurul Aina",
    email: "nurul@example.com",
    phoneNumber: "0142738495",
    icNumber: "000123010234",
    contingentName: "Young Coders",
    schoolName: "SK Taman Tun",
    registrationDate: new Date("2025-03-05"),
    status: "ACTIVE",
    educationLevel: "PRIMARY",
    contestantsCount: 8,
  },
  {
    id: 5,
    name: "David Tan",
    email: "david@example.com",
    phoneNumber: "0165432198",
    icNumber: "980712089876",
    contingentName: "Innovation Hub",
    schoolName: "Universiti Malaya",
    registrationDate: new Date("2025-01-20"),
    status: "INACTIVE",
    educationLevel: "HIGHER",
    contestantsCount: 0,
  },
];

export default function ParticipantsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Filter participants based on search term and active tab
  const filteredParticipants = mockParticipants.filter((participant) => {
    const matchesSearch = 
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.icNumber.includes(searchTerm) ||
      participant.contingentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "primary") return matchesSearch && participant.educationLevel === "PRIMARY";
    if (activeTab === "secondary") return matchesSearch && participant.educationLevel === "SECONDARY";
    if (activeTab === "higher") return matchesSearch && participant.educationLevel === "HIGHER";
    return matchesSearch;
  });

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Participant Management" 
        description="Manage all registered participants and their contingents"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by name, email or IC..."
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
            <span>Export</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">
            <Mail className="w-4 h-4" />
            <span>Send Email</span>
          </Button>
          <Button asChild className="h-9 gap-1">
            <Link href="/organizer/participants/invite">
              <UserPlus className="w-4 h-4" />
              <span>Invite Participant</span>
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Participants</TabsTrigger>
          <TabsTrigger value="primary">Primary School</TabsTrigger>
          <TabsTrigger value="secondary">Secondary School</TabsTrigger>
          <TabsTrigger value="higher">Higher Education</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          <ParticipantsTable participants={filteredParticipants} />
        </TabsContent>

        <TabsContent value="primary" className="space-y-4 mt-4">
          <ParticipantsTable participants={filteredParticipants} />
        </TabsContent>

        <TabsContent value="secondary" className="space-y-4 mt-4">
          <ParticipantsTable participants={filteredParticipants} />
        </TabsContent>
        
        <TabsContent value="higher" className="space-y-4 mt-4">
          <ParticipantsTable participants={filteredParticipants} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ParticipantsTable({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <Search className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium">No participants found</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4 max-w-md">
          Try adjusting your search or filter to find what you're looking for
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Contingent</TableHead>
            <TableHead>Education Level</TableHead>
            <TableHead>Contestants</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant) => (
            <TableRow key={participant.id}>
              <TableCell className="font-medium">{participant.name}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{participant.email}</div>
                  <div className="text-gray-500">{participant.phoneNumber}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{participant.contingentName}</div>
                  <div className="text-gray-500">{participant.schoolName}</div>
                </div>
              </TableCell>
              <TableCell>
                {participant.educationLevel === "PRIMARY" && "Primary School"}
                {participant.educationLevel === "SECONDARY" && "Secondary School"}
                {participant.educationLevel === "HIGHER" && "Higher Education"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{participant.contestantsCount}</Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  className={
                    participant.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                    participant.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  }
                >
                  {participant.status}
                </Badge>
              </TableCell>
              <TableCell>{format(participant.registrationDate, "MMM d, yyyy")}</TableCell>
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
                      <Link href={`/organizer/participants/${participant.id}`} className="w-full">
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>View Contestants</DropdownMenuItem>
                    <DropdownMenuItem>View Contingent</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {participant.status === "ACTIVE" ? (
                      <DropdownMenuItem className="text-amber-600">Deactivate</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-green-600">Activate</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
