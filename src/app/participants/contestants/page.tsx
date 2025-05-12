'use client';

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { downloadContestantsAsDocx } from "@/lib/docx-export";
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
  FileText,
  FileDown
} from "lucide-react";
import Link from "next/link";
import EditContestantModal from "./_components/edit-contestant-modal";
import ContestantsFilters from "./_components/contestants-filters";
import Pagination from "./_components/pagination";
import BulkAssignContests from "./_components/bulk-assign-contests";
import AssignContestsModal from "./_components/assign-contests-modal";
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
  const { t } = useLanguage();
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [eduLevelFilter, setEduLevelFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContestants, setTotalContestants] = useState(0);
  const [limit] = useState(20); // 20 records per page
  
  // Filter state
  const [classGradeFilter, setClassGradeFilter] = useState("");
  const [classNameFilter, setClassNameFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  
  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/participants/auth/login");
    }
  }, [status]);
  
  // State to track if user has any contingents
  const [hasContingents, setHasContingents] = useState<boolean | null>(null);

  // Check if the user has any contingents
  const checkContingents = async () => {
    if (!session?.user?.email) return;
    
    try {
      setIsLoading(true);
      
      const contingentsResponse = await fetch('/api/participants/contingents/managed');
      
      if (!contingentsResponse.ok) {
        throw new Error('Failed to check contingents');
      }
      
      const contingentsData = await contingentsResponse.json();
      const hasAnyContingents = contingentsData && contingentsData.length > 0;
      
      setHasContingents(hasAnyContingents);
      
      // Only proceed to fetch contestants if the user has contingents
      if (hasAnyContingents) {
        fetchContestants(1);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking contingents:", error);
      setHasContingents(false);
      setIsLoading(false);
    }
  };
  
  // Fetch contestants with filters and pagination
  const fetchContestants = async (page = currentPage) => {
    if (!session?.user?.email) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (classGradeFilter && classGradeFilter !== 'all') {
        params.append('class_grade', classGradeFilter);
      }
      
      if (classNameFilter) {
        params.append('class_name', classNameFilter);
      }
      
      if (ageFilter) {
        params.append('age', ageFilter);
      }
      
      // Fetch contestants with filters and pagination
      const contestantsResponse = await fetch(`/api/participants/contestants?${params.toString()}`);
      
      if (!contestantsResponse.ok) {
        const errorData = await contestantsResponse.json();
        throw new Error(errorData.error || t('contestant.error_fetch'));
      }
      
      const result = await contestantsResponse.json();
      setContestants(result.data);
      setTotalContestants(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setCurrentPage(result.pagination.page);
      
      // If no contestants are found but the API call was successful
      if (result.data.length === 0 && result.pagination.total === 0) {
        console.log("No contestants found for managed contingents");
      }
    } catch (error) {
      console.error("Error fetching contestants:", error);
      setError(t('contestant.error_load'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial check for contingents before fetching contestants
  useEffect(() => {
    if (session?.user?.email) {
      checkContingents();
    }
  }, [session]);
  
  // Filter contestants based on search query and education level (client-side filtering for the search box only)
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
  
  // Handle filter apply
  const handleFilterApply = () => {
    fetchContestants(1); // Reset to first page when applying filters
  };
  
  // Handle filter reset
  const handleFilterReset = () => {
    setClassGradeFilter("");
    setClassNameFilter("");
    setAgeFilter("");
    // Fetch with reset filters
    setTimeout(() => {
      fetchContestants(1);
    }, 0);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    fetchContestants(page);
  };
  
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
        throw new Error(error.error || t('contestant.delete.error'));
      }
      
      // Update the local state
      setContestants(contestants.filter(c => c.id !== id));
      toast.success(t('contestant.delete.success'));
    } catch (error: any) {
      console.error("Error deleting contestant:", error);
      toast.error(error.message || t('contestant.delete.error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Education level badge component
  const EduLevelBadge = ({ eduLevel }: { eduLevel: string }) => {
    switch (eduLevel) {
      case "sekolah rendah":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">{t('contestant.primary_school')}</Badge>;
      case "sekolah menengah":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600">{t('contestant.secondary_school')}</Badge>;
      case "belia":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600">{t('contestant.youth')}</Badge>;
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
        <div className="p-8 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }
    
    if (contestantsToRender.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">{t('contestant.no_contestants_found')}</p>
          <div className="flex justify-center mt-4">
            <Button asChild>
              <Link href="/participants/contestants/new">
                <UserPlus className="mr-2 h-4 w-4" /> {t('contestant.add_contestant')}
              </Link>
            </Button>
          </div>
        </div>
      );
    }
    
    // Show pagination only when we're not doing client-side filtering
    const shouldShowPagination = totalPages > 1 && searchQuery === "" && eduLevelFilter === "all";
    
    return (
      <div className="space-y-4">
        <Table>
          <TableCaption>
            {shouldShowPagination 
              ? `${t('contestant.showing')} ${contestants.length} ${t('contestant.of')} ${totalContestants} ${t('contestant.contestants')} (${t('contestant.page')} ${currentPage} ${t('contestant.of')} ${totalPages})`
              : `${t('contestant.total')}: ${contestantsToRender.length} ${t('contestant.contestants')}`
            }
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('contestant.name')}</TableHead>
              <TableHead>{t('contestant.ic_number')}</TableHead>
              <TableHead>{t('contestant.contact')}</TableHead>
              <TableHead>{t('contestant.gender')}</TableHead>
              <TableHead>{t('contestant.age')}</TableHead>
              <TableHead>{t('contestant.education_level')}</TableHead>
              <TableHead>{t('contestant.class')}</TableHead>
              <TableHead>{t('contestant.added_by')}</TableHead>
              <TableHead>{t('contestant.status')}</TableHead>
              <TableHead className="text-right">{t('contestant.actions')}</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {contestantsToRender.map((contestant) => (
            <TableRow key={contestant.id}>
              <TableCell>
                <div className="font-medium">{contestant.name}</div>
              </TableCell>
              <TableCell>{contestant.ic}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {contestant.email && <div className="text-xs">{contestant.email}</div>}
                  {contestant.phoneNumber && <div className="text-xs">{contestant.phoneNumber}</div>}
                </div>
              </TableCell>
              <TableCell>{contestant.gender}</TableCell>
              <TableCell>{contestant.age}</TableCell>
              <TableCell>
                <EduLevelBadge eduLevel={contestant.edu_level} />
              </TableCell>
              <TableCell>
                {contestant.class_grade && contestant.class_name 
                  ? `${contestant.class_grade} - ${contestant.class_name}` 
                  : contestant.class_name || contestant.class_grade || '-'}
              </TableCell>
              <TableCell>
                <div className="text-xs">{contestant.updatedBy || '-'}</div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={contestant.status === "ACTIVE" ? "default" : "secondary"}
                  className={contestant.status === "ACTIVE" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                >
                  {contestant.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end items-center space-x-1">
                  <AssignContestsModal
                    contestantId={contestant.id}
                    contestantName={contestant.name}
                    onSuccess={() => fetchContestants(currentPage)}
                  />
                  <EditContestantModal 
                    contestant={contestant} 
                    onUpdate={(updatedContestant) => {
                      // Update the contestant in the local state
                      setContestants(prev => 
                        prev.map(c => c.id === updatedContestant.id ? updatedContestant : c)
                      );
                    }} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteContestant(contestant.id, contestant.contingentId)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
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
                    <DropdownMenuLabel>{t('contestant.actions')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => {}}>
                      <Link href={`/participants/contingents/${contestant.contingentId}`} className="flex items-center w-full">
                        <Pencil className="h-4 w-4 mr-2" /> {t('contestant.view')} Contingent
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
                      <span className="ml-2">{t('contestant.edit_contestant')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <AssignContestsModal
                        contestantId={contestant.id}
                        contestantName={contestant.name}
                        onSuccess={() => fetchContestants(currentPage)}
                      />
                      <span className="ml-2">{t('contestant.contests.assign_button')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDeleteContestant(contestant.id, contestant.contingentId)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> {t('contestant.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalPages > 1 && searchQuery === "" && eduLevelFilter === "all" && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={handlePageChange} 
          />
        )}
      </div>
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
  
  // If user has no contingents, display message to create one first
  if (hasContingents === false) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('contestant.title')}</h1>
        </div>
        
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="pt-6 text-center py-12">
            <School className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('contestant.no_contingent_title') || "No Contingent Found"}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('contestant.no_contingent_message') || "You need to create or join a contingent before you can add contestants. Please create a contingent first."}
            </p>
            <Link href="/participants/contingents">
              <Button size="lg">
                <Users className="mr-2 h-5 w-5" />
                {t('contestant.create_contingent') || "Go to Contingents"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Normal page rendering when user has contingents
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('contestant.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('contestant.description')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild>
            <Link href="/participants/contestants/new">
              <UserPlus className="mr-2 h-4 w-4" /> {t('contestant.add')}
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/participants/contestants/bulk">
              <Upload className="mr-2 h-4 w-4" /> {t('contestant.bulk_upload')}
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/templates/contestants-template.csv" download>
              <Download className="h-4 w-4" />
              {t('contestant.template')}
            </Link>
          </Button>
          <BulkAssignContests />
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Search and filter controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('contestant.search_placeholder')}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-row gap-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={eduLevelFilter}
              onChange={(e) => setEduLevelFilter(e.target.value)}
            >
              <option value="all">{t('contestant.all_edu_levels')}</option>
              <option value="sekolah rendah">{t('contestant.primary_school')}</option>
              <option value="sekolah menengah">{t('contestant.secondary_school')}</option>
              <option value="belia">{t('contestant.youth')}</option>
            </select>
          </div>
        </div>
        
        {/* Advanced Filters */}
        <ContestantsFilters
          classGrade={classGradeFilter}
          setClassGrade={setClassGradeFilter}
          className={classNameFilter}
          setClassName={setClassNameFilter}
          age={ageFilter}
          setAge={setAgeFilter}
          onFilterApply={handleFilterApply}
          onFilterReset={handleFilterReset}
        />
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => downloadContestantsAsDocx(filteredContestants, `senarai_peserta_${new Date().toISOString().split('T')[0]}`)}
          >
            <FileDown className="mr-2 h-4 w-4" /> {t('contestant.export')}
          </Button>
        </div>
      </div>
    </div>
  );
}
