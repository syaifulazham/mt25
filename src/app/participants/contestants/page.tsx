'use client';

import { useState, useEffect } from "react";
import { Contestant } from "@/types/contestant";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  Users, 
  UserPlus, 
  School, 
  GraduationCap, 
  User, 
  Filter, 
  Download, 
  Upload, 
  Trash2,
  Pencil,
  FileText
} from "lucide-react";
import Link from "next/link";
// // import BulkUploadModal from "./_components/bulk-upload-modal";
import EditContestantModal from "./_components/edit-contestant-modal";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Using the shared Contestant interface from @/types/contestant

export default function ContestantsPage() {
  const { data: session, status } = useSession();
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [eduLevelFilter, setEduLevelFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  
  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/participants/auth/login");
    }
  }, [status]);
  
  // Fetch contestants for all contingents managed by the user
  useEffect(() => {
    const fetchContestants = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all contestants from managed contingents in a single API call
        const contestantsResponse = await fetch('/api/participants/contestants');
        
        if (!contestantsResponse.ok) {
          const errorData = await contestantsResponse.json();
          throw new Error(errorData.error || "Failed to fetch contestants");
        }
        
        const contestantsData = await contestantsResponse.json();
        setContestants(contestantsData);
        
        // If no contestants are found but the API call was successful
        if (contestantsData.length === 0) {
          console.log("No contestants found for managed contingents");
        }
      } catch (error) {
        console.error("Error fetching contestants:", error);
        setError("Failed to load contestants. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContestants();
  }, [session]);
  
  // Filter contestants based on search query and education level
  const filteredContestants = contestants.filter(contestant => {
    const matchesSearch = 
      searchQuery === "" || 
      contestant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contestant.ic.includes(searchQuery);
    
    const matchesEduLevel = 
      eduLevelFilter === "all" || 
      contestant.edu_level === eduLevelFilter;
    
    return matchesSearch && matchesEduLevel;
  });
  
  // Group contestants by education level
  const contestantsByEduLevel = {
    "sekolah rendah": contestants.filter(c => c.edu_level === "sekolah rendah"),
    "sekolah menengah": contestants.filter(c => c.edu_level === "sekolah menengah"),
    "belia": contestants.filter(c => c.edu_level === "belia")
  };
  
  // Handle contestant deletion
  const handleDeleteContestant = async (id: number, contingentId: number) => {
    if (!confirm("Are you sure you want to delete this contestant?")) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/participants/contestants?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete contestant");
      }
      
      // Update the local state
      setContestants(contestants.filter(c => c.id !== id));
      toast.success("Contestant deleted successfully");
    } catch (error: any) {
      console.error("Error deleting contestant:", error);
      toast.error(error.message || "Failed to delete contestant");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Education level badge component
  const EduLevelBadge = ({ eduLevel }: { eduLevel: string }) => {
    switch (eduLevel) {
      case "sekolah rendah":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Primary School</Badge>;
      case "sekolah menengah":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600">Secondary School</Badge>;
      case "belia":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Youth</Badge>;
      default:
        return <Badge variant="outline">{eduLevel}</Badge>;
    }
  };
  
  // Function to render the contestants table
  const renderContestantsTable = (contestantsToRender: Contestant[]) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      );
    }
    
    if (contestantsToRender.length === 0) {
      return (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground">No contestants found</p>
          <div className="flex justify-center mt-4">
            <Button asChild>
              <Link href="/participants/contestants/new">
                <UserPlus className="mr-2 h-4 w-4" /> Add Contestant
              </Link>
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <Table>
        <TableCaption>Total: {contestantsToRender.length} contestants</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>IC Number</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Education Level</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Added By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contestantsToRender.map((contestant) => (
            <TableRow key={contestant.id}>
              <TableCell className="font-medium">{contestant.name}</TableCell>
              <TableCell>{contestant.ic}</TableCell>
              <TableCell>
                {contestant.email && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Email:</span> {contestant.email}
                  </div>
                )}
                {contestant.phoneNumber && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Phone:</span> {contestant.phoneNumber}
                  </div>
                )}
                {!contestant.email && !contestant.phoneNumber && '-'}
              </TableCell>
              <TableCell>{contestant.gender}</TableCell>
              <TableCell>{contestant.age}</TableCell>
              <TableCell>
                <EduLevelBadge eduLevel={contestant.edu_level} />
              </TableCell>
              <TableCell>{contestant.class_name || '-'}</TableCell>
              <TableCell>
                <div className="text-xs">{contestant.updatedBy || '-'}</div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={`
                    ${contestant.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600' : ''}
                    ${contestant.status === 'INACTIVE' ? 'bg-gray-500/10 text-gray-600' : ''}
                    ${contestant.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600' : ''}
                  `}
                >
                  {contestant.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center space-x-1">
                  <EditContestantModal 
                    contestant={contestant} 
                    onUpdate={(updatedContestant) => {
                      // Update the contestant in the local state
                      setContestants(prev => 
                        prev.map(c => c.id === updatedContestant.id ? updatedContestant : c)
                      );
                    }} 
                  />
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => {}}>
                      <Link href={`/participants/contingents/${contestant.contingentId}`} className="flex items-center w-full">
                        <School className="h-4 w-4 mr-2" /> View Contingent
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <EditContestantModal 
                        contestant={contestant} 
                        onUpdate={(updatedContestant) => {
                          // Update the contestant in the local state
                          setContestants(prev => 
                            prev.map(c => c.id === updatedContestant.id ? updatedContestant : c)
                          );
                        }} 
                      />
                      <span className="ml-2">Edit Contestant</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDeleteContestant(contestant.id, contestant.contingentId)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contestants</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Register and manage contestants for Techlympics 2025
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/participants/contestants/new">
              <UserPlus className="mr-2 h-4 w-4" /> Add Contestant
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/participants/contestants/bulk">
              <Upload className="mr-2 h-4 w-4" /> Bulk Upload
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/templates/contestants-template.csv" download>
              <Download className="h-4 w-4" />
              Template
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or IC..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <Label htmlFor="edu-level-filter" className="text-sm">Education Level:</Label>
          <Select value={eduLevelFilter} onValueChange={setEduLevelFilter}>
            <SelectTrigger id="edu-level-filter" className="w-[180px]">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="sekolah rendah">Primary School</SelectItem>
              <SelectItem value="sekolah menengah">Secondary School</SelectItem>
              <SelectItem value="belia">Youth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all" className="relative">
            All
            <Badge variant="secondary" className="ml-2 bg-gray-500/10">
              {contestants.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="primary" className="relative">
            Primary
            <Badge variant="secondary" className="ml-2 bg-blue-500/10">
              {contestantsByEduLevel["sekolah rendah"].length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="secondary" className="relative">
            Secondary
            <Badge variant="secondary" className="ml-2 bg-purple-500/10">
              {contestantsByEduLevel["sekolah menengah"].length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="youth" className="relative">
            Youth
            <Badge variant="secondary" className="ml-2 bg-amber-500/10">
              {contestantsByEduLevel["belia"].length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {renderContestantsTable(filteredContestants)}
        </TabsContent>
        
        <TabsContent value="primary" className="mt-4">
          {renderContestantsTable(
            filteredContestants.filter(c => c.edu_level === "sekolah rendah")
          )}
        </TabsContent>
        
        <TabsContent value="secondary" className="mt-4">
          {renderContestantsTable(
            filteredContestants.filter(c => c.edu_level === "sekolah menengah")
          )}
        </TabsContent>
        
        <TabsContent value="youth" className="mt-4">
          {renderContestantsTable(
            filteredContestants.filter(c => c.edu_level === "belia")
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredContestants.length} of {contestants.length} contestants
        </p>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
        </div>
      </div>
    </div>
  );
}
