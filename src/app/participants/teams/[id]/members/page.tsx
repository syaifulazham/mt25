"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ChevronLeft,
  User,
  Users,
  Search,
  Plus,
  Trash2,
  Info,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  classGrade?: string;
  className?: string;
  class?: string;
  age?: number;
}

// Target group item type definition
interface TargetGroupItem {
  id: number;
  code: string;
  name: string;
  ageGroup: string;
  schoolLevel: string;
  maxAge: number;
  minAge: number;
}

interface Team {
  id: number;
  name: string;
  hashcode: string;
  description?: string;
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
  isManager: boolean;
  minAge?: number;  // Min age from the contest
  maxAge?: number;  // Max age from the contest
  targetGroup?: {
    educationLevels?: string[];
    schoolCategories?: string[];
    genders?: string[];
  }; // Target group criteria
  createdAt: string;
  updatedAt: string;
}

interface Contestant {
  id: number;
  name: string;
  icNumber: string;
  email?: string;
  gender?: string;
  age?: number;
  educationLevel?: string;
  class_grade?: string;
  class_name?: string;
  status: string;
  inTeam: boolean;
}

export default function TeamMembersPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [targetGroups, setTargetGroups] = useState<{id: number|string, name: string}[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [filteredContestants, setFilteredContestants] = useState<Contestant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [educationFilter, setEducationFilter] = useState<string>("all");
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingContestants, setIsLoadingContestants] = useState(false);
  const [contestantsPagination, setContestantsPagination] = useState({
    page: 1,
    totalPages: 1,
    totalContestants: 0,
    hasMore: false,
  });
  const [confirmRemoveDialogOpen, setConfirmRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  
  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce delay
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Function to fetch contestants with pagination and search
  const fetchContestants = async (options: {
    page?: number;
    limit?: number;
    search?: string;
    educationLevel?: string;
    targetGroup?: string;
  } = {}) => {
    const {
      page = 1,
      limit = 100,
      search = "",
      educationLevel = "all",
      targetGroup = "all"
    } = options;
    
    try {
      setIsLoadingContestants(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", limit.toString());
      
      if (search) {
        queryParams.append("search", search);
      }
      
      if (educationLevel && educationLevel !== "all") {
        queryParams.append("educationLevel", educationLevel);
      }
      
      if (targetGroup && targetGroup !== "all") {
        queryParams.append("targetGroup", targetGroup);
      }
      
      // Add contest ID if available to filter by age
      if (team?.contestId) {
        queryParams.append("contestId", team.contestId.toString());
      }
      
      const url = `/api/participants/contestants?${queryParams.toString()}`;
      console.log(`Fetching contestants with: ${url}`);
      
      const contestantsResponse = await fetch(url, {
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!contestantsResponse.ok) {
        throw new Error("Failed to fetch contestants");
      }
      
      const contestantsData = await contestantsResponse.json();
      
      // Handle both response formats (array or paginated object)
      let contestantsArray = [];
      let paginationInfo = {
        page,
        totalPages: 1,
        totalContestants: 0,
        hasMore: false,
      };
      
      if (Array.isArray(contestantsData)) {
        contestantsArray = contestantsData;
        paginationInfo.totalContestants = contestantsArray.length;
      } else {
        contestantsArray = contestantsData.data || [];
        paginationInfo.totalPages = contestantsData.totalPages || 1;
        paginationInfo.totalContestants = contestantsData.totalItems || contestantsArray.length;
        paginationInfo.hasMore = page < paginationInfo.totalPages;
      }
      
      console.log(`Loaded ${contestantsArray.length} contestants (page ${page}/${paginationInfo.totalPages}, total: ${paginationInfo.totalContestants})`);
      
      // Mark contestants who are already in a team
      const enhancedContestants = contestantsArray.map((contestant: Contestant) => ({
        ...contestant,
        inTeam: team?.members.some((member: TeamMember) => member.contestantId === contestant.id) || false,
      }));
      
      return { contestants: enhancedContestants, pagination: paginationInfo };
    } catch (error) {
      console.error("Error fetching contestants:", error);
      toast.error(t('team.members.error_fetch_contestants'));
      return { 
        contestants: [], 
        pagination: {
          page,
          totalPages: 1,
          totalContestants: 0,
          hasMore: false,
        } 
      };
    } finally {
      setIsLoadingContestants(false);
    }
  };
  
  // Load more contestants when scrolling
  const loadMoreContestants = async () => {
    if (isLoadingContestants || !contestantsPagination.hasMore) return;
    
    const nextPage = contestantsPagination.page + 1;
    const { contestants: newContestants, pagination } = await fetchContestants({
      page: nextPage,
      search: debouncedSearchTerm,
      educationLevel: educationFilter,
      targetGroup: targetGroupFilter
    });
    
    setContestants(prev => [...prev, ...newContestants]);
    setFilteredContestants(prev => [...prev, ...newContestants]);
    setContestantsPagination(pagination);
  };
  
  // Function to load all contestants (used when search doesn't return expected results)
  const loadAllContestantsForSearch = async () => {
    console.log("Loading all contestants for client-side search");
    setIsSearching(true);
    
    // Load a large batch initially
    const { contestants: initialBatch, pagination } = await fetchContestants({
      page: 1,
      limit: 500, // Load more initially for better search
      // Don't include search term as we'll filter client-side
      educationLevel: educationFilter,
      targetGroup: targetGroupFilter
    });
    
    let allContestants = [...initialBatch];
    let currentPage = 1;
    let hasMore = pagination.hasMore;
    
    // Load additional pages if needed (up to 5 pages total = 2500 contestants)
    while (hasMore && currentPage < 5) {
      currentPage++;
      const { contestants: nextBatch, pagination: nextPagination } = await fetchContestants({
        page: currentPage,
        limit: 500,
        educationLevel: educationFilter,
        targetGroup: targetGroupFilter
      });
      
      allContestants = [...allContestants, ...nextBatch];
      hasMore = nextPagination.hasMore;
    }
    
    console.log(`Loaded ${allContestants.length} contestants for client-side search`);
    
    // Apply client-side search
    const filteredResults = allContestants.filter(contestant => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        contestant.name?.toLowerCase().includes(searchLower) ||
        contestant.icNumber?.toLowerCase().includes(searchLower) ||
        contestant.email?.toLowerCase().includes(searchLower)
      );
    });
    
    setContestants(allContestants);
    setFilteredContestants(filteredResults);
    setContestantsPagination({
      page: 1,
      totalPages: 1,
      totalContestants: allContestants.length,
      hasMore: false
    });
    setIsSearching(false);
  };
  
  // Effect to handle search and filter changes - using client-side filtering
  useEffect(() => {
    if (!contestants.length) return;
    
    setIsSearching(true);
    
    // Filter the already loaded contestants client-side
    const filtered = contestants.filter(contestant => {
      // Apply search filter
      const matchesSearch = !debouncedSearchTerm || 
        contestant.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contestant.icNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contestant.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      // Apply education level filter
      const matchesEducation = educationFilter === 'all' || 
        contestant.educationLevel?.toLowerCase() === educationFilter.toLowerCase() ||
        (educationFilter === 'primary' && contestant.educationLevel?.toLowerCase().includes('rendah')) ||
        (educationFilter === 'secondary' && contestant.educationLevel?.toLowerCase().includes('menengah')) ||
        (educationFilter === 'youth' && contestant.educationLevel?.toLowerCase().includes('belia'));
      
      // We're not using target group filtering anymore since the API doesn't exist
      const matchesTargetGroup = true; // Always match since we're not filtering by target group
      
      return matchesSearch && matchesEducation && matchesTargetGroup;
    });
    
    setFilteredContestants(filtered);
    setIsSearching(false);
    
  }, [debouncedSearchTerm, educationFilter, targetGroupFilter, contestants, team]);
  
  // Function for the search input field
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Fetch the team details and available contestants
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        // Fetch team details
        const teamResponse = await fetch(`/api/participants/teams/${params.id}`, {
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!teamResponse.ok) {
          throw new Error("Failed to fetch team details");
        }
        
        const teamData = await teamResponse.json();
        // Log full team data for debugging permission issues
        console.log('Team data received:', {
          id: teamData.id,
          name: teamData.name,
          isOwner: teamData.isOwner,
          isManager: teamData.isManager,
          contestId: teamData.contestId,
        });
        
        // Fetch contest details to get target group information if not already included
        if (teamData.contestId && (!teamData.targetGroup || !teamData.minAge)) {
          try {
            const contestResponse = await fetch(`/api/participants/contests/${teamData.contestId}`, {
              headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (contestResponse.ok) {
              const contestData = await contestResponse.json();
              
              // Update team data with contest target group information
              teamData.targetGroup = contestData.targetGroup || {};
              teamData.minAge = contestData.minAge || teamData.minAge;
              teamData.maxAge = contestData.maxAge || teamData.maxAge;
              
              // More detailed logging to see exactly what targetgroup data we have
              console.log('Contest target group info:', {
                contestId: teamData.contestId,
                targetgroup: contestData.targetgroup || [],
                minAge: teamData.minAge,
                maxAge: teamData.maxAge
              });
              
              // Extract education levels from the targetgroup array
              if (contestData.targetgroup && Array.isArray(contestData.targetgroup)) {
                // Get distinct school levels from the targetgroup array and make them lowercase
                const schoolLevels = Array.from(new Set(
                  contestData.targetgroup
                    .filter((tg: TargetGroupItem) => tg.schoolLevel)
                    .map((tg: TargetGroupItem) => tg.schoolLevel.toLowerCase()) // Convert to lowercase
                ));
                
                // Store the school levels in the team data for filtering
                teamData.targetGroup = { 
                  educationLevels: schoolLevels 
                };
                
                console.log('DEBUG - Extracted school levels for filtering:', {
                  schoolLevels,
                  rawTargetgroup: contestData.targetgroup
                });
              }
            }
          } catch (error) {
            console.error('Error fetching contest details:', error);
          }
        }
        
        setTeam(teamData);
        
        // Initial fetch of contestants with first page
        // Skip fetching target groups as the endpoints don't exist
        // Setting a default empty array for target groups to avoid UI errors
        setTargetGroups([]);
        
        // Load all contestants at once with a very high limit to ensure we get all of them
        try {
          setIsLoadingContestants(true);
          const contestantsResponse = await fetch(`/api/participants/contestants?limit=10000`, {
            headers: {
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!contestantsResponse.ok) {
            throw new Error("Failed to fetch contestants");
          }
          
          const contestantsData = await contestantsResponse.json();
          
          // Handle both response formats (array or paginated object)
          const contestantsArray = Array.isArray(contestantsData) 
            ? contestantsData 
            : contestantsData.data || [];
          
          console.log('Total contestants loaded:', contestantsArray.length);
          
          // Mark contestants who are already in a team
          const enhancedContestants = contestantsArray.map((contestant: Contestant) => ({
            ...contestant,
            inTeam: teamData.members.some((member: TeamMember) => member.contestantId === contestant.id)
          }));
          
          setContestants(enhancedContestants);
          setFilteredContestants(enhancedContestants);
          setContestantsPagination({
            page: 1,
            totalPages: 1,
            totalContestants: enhancedContestants.length,
            hasMore: false
          });
        } catch (error) {
          console.error("Error loading all contestants:", error);
          // If loading all at once fails, fall back to the original pagination approach
          const { contestants: initialContestants, pagination } = await fetchContestants({ 
            page: 1,
            limit: 1000 // Still use a higher limit than before
          });
          
          setContestants(initialContestants);
          setFilteredContestants(initialContestants);
          setContestantsPagination(pagination);
        } finally {
          setIsLoadingContestants(false);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        // Show more specific error message
        if (error.message) {
          toast.error(t('team.members.load_error_with_details').replace('{message}', error.message));
        } else {
          toast.error(t('team.members.load_error'));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [session, params.id]);
  
  // For debugging - log education levels when component mounts
  useEffect(() => {
    if (contestants.length > 0) {
      // Get unique education levels in the data
      const uniqueEduLevels = Array.from(new Set(
        contestants
          .filter(c => c.educationLevel)
          .map(c => c.educationLevel?.toLowerCase().trim())
      ));
      
      console.log('AVAILABLE EDUCATION LEVELS IN DATABASE:', uniqueEduLevels);
      console.log('Sample contestants:', contestants.slice(0, 5).map(c => ({
        name: c.name,
        educationLevel: c.educationLevel || 'NONE'
      })));
    }
  }, [contestants]);
  
  // Filter contestants based on search term, education level, and age criteria
  useEffect(() => {
    if (!contestants.length || !team) return;
    
    let filtered = [...contestants];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(contestant => 
        contestant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contestant.icNumber && contestant.icNumber.includes(searchTerm)) ||
        (contestant.email && contestant.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply education level filter if selected in UI
    if (educationFilter !== "all") {
      console.log(`Filtering by education level: "${educationFilter}"`); // Debug logging
      
      // Log what we know before filtering
      console.log('Before filtering:', {
        totalContestants: filtered.length,
        filterValue: educationFilter,
        sampleContestants: filtered.slice(0, 3).map(c => ({
          name: c.name, 
          educationLevel: c.educationLevel || 'NONE'
        }))
      });
      
      // EDUCATIONAL LEVEL MAPPING TABLE
      const primaryKeywords = ['primary', 'rendah', 'sr', 'primary school', 'sekolah rendah', 'pr', 'primary school', 'sd', 'darjah', 'sk'];
      const secondaryKeywords = ['secondary', 'menengah', 'sm', 'secondary school', 'sekolah menengah', 'smk', 'high school', 'sma'];
      const youthKeywords = ['youth', 'belia', 'university', 'college', 'higher', 'diploma', 'degree', 'pre-u'];
      
      // Function to check if education level belongs to a category
      const matchesEducationCategory = (level: string, keywords: string[]): boolean => {
        const lowerLevel = level.toLowerCase().trim();
        return keywords.some(keyword => lowerLevel.includes(keyword));
      };
      
      filtered = filtered.filter(contestant => {
        // Handle case where contestant has no education level
        if (!contestant.educationLevel) {
          return false;
        }
        
        // Get normalized education level
        const contestantLevel = contestant.educationLevel.toLowerCase().trim();
        
        // Log for debugging
        console.log(`Checking education level for ${contestant.name}: "${contestantLevel}" against filter ${educationFilter}`);
      
        // Check if the contestant's education level matches the selected filter
        let isMatch = false;
        
        switch(educationFilter) {
          case 'primary':
            isMatch = matchesEducationCategory(contestantLevel, primaryKeywords);
            break;
            
          case 'secondary':
            isMatch = matchesEducationCategory(contestantLevel, secondaryKeywords);
            break;
            
          case 'youth':
            isMatch = matchesEducationCategory(contestantLevel, youthKeywords);
            break;
            
          default:
            // Default exact match
            isMatch = contestantLevel === educationFilter.toLowerCase().trim();
        }
        
        console.log(`Match result for ${contestant.name}: ${isMatch}`);
        return isMatch;
      });
      
      console.log(`After filtering by '${educationFilter}': ${filtered.length} contestants remain`);
    }
    
    // Apply target group filtering based on contest criteria ONLY if user hasn't selected a specific filter
    // This ensures we don't double-filter and override the user's selection
    if (educationFilter === "all" && team.targetGroup?.educationLevels && team.targetGroup.educationLevels.length > 0) {
      console.log('Applying contest target group filter (since user selected "all")');
      console.log('Available target group levels:', team.targetGroup.educationLevels);
      
      // Use the same education level keywords as the user filter
      const primaryKeywords = ['primary', 'rendah', 'sr', 'primary school', 'sekolah rendah', 'pr', 'primary school', 'sd', 'darjah', 'sk'];
      const secondaryKeywords = ['secondary', 'menengah', 'sm', 'secondary school', 'sekolah menengah', 'smk', 'high school', 'sma'];
      const youthKeywords = ['youth', 'belia', 'university', 'college', 'higher', 'diploma', 'degree', 'pre-u'];
      
      // Function to check if education level belongs to a category (same as above)
      const matchesEducationCategory = (level: string, keywords: string[]): boolean => {
        const lowerLevel = level.toLowerCase().trim();
        return keywords.some(keyword => lowerLevel.includes(keyword));
      };
      
      filtered = filtered.filter(contestant => {
        // Skip filtering if contestant doesn't have education level
        if (!contestant.educationLevel) return false;
        
        const contestantLevel = contestant.educationLevel.toLowerCase().trim();
        
        // Check if contestant level matches any of the target group levels
        const isMatch = team.targetGroup?.educationLevels?.some(targetLevel => {
          // Convert target level to lowercase for comparison
          const normalizedTargetLevel = targetLevel.toLowerCase().trim();
          
          // Use our keyword matching function
          if (normalizedTargetLevel === 'primary' || primaryKeywords.includes(normalizedTargetLevel)) {
            return matchesEducationCategory(contestantLevel, primaryKeywords);
          }
          else if (normalizedTargetLevel === 'secondary' || secondaryKeywords.includes(normalizedTargetLevel)) {
            return matchesEducationCategory(contestantLevel, secondaryKeywords);
          }
          else if (normalizedTargetLevel === 'youth' || youthKeywords.includes(normalizedTargetLevel)) {
            return matchesEducationCategory(contestantLevel, youthKeywords);
          }
          else {
            // Default to exact match
            return contestantLevel === normalizedTargetLevel;
          }
        });
        
        if (!isMatch) {
          console.log(`Excluding contestant by target group filter: ${contestant.name} (${contestantLevel})`);
        }
        
        return isMatch;
      });
      
      console.log(`After target group filtering: ${filtered.length} contestants remain`);
    }
    
    // Filter by gender if specified in target group
    if (team.targetGroup?.genders && team.targetGroup.genders.length > 0) {
      filtered = filtered.filter(contestant => {
        // Skip filtering if contestant doesn't have gender
        if (!contestant.gender) return true;
        
        return team.targetGroup?.genders?.some(gender => 
          gender.toLowerCase() === contestant.gender?.toLowerCase()
        );
      });
    }
    
    // Apply age criteria filter based on contest requirements
    // Safely destructure with default values
    const minAge = team?.minAge;
    const maxAge = team?.maxAge;
    
    if (minAge || maxAge) {
      filtered = filtered.filter(contestant => {
        // Skip filtering if contestant doesn't have age
        if (contestant.age === undefined || contestant.age === null) return true;
        
        // Check minimum age requirement
        if (minAge !== undefined && minAge !== null && contestant.age < minAge) return false;
        
        // Check maximum age requirement
        if (maxAge !== undefined && maxAge !== null && contestant.age > maxAge) return false;
        
        return true;
      });
    }
    
    setFilteredContestants(filtered);
  }, [searchTerm, educationFilter, contestants, team]);
  
  // Handle adding a contestant to the team
  const handleAddMember = async (contestantId: number) => {
    try {
      setIsAddingMember(true);
      
      const response = await fetch(`/api/participants/teams/${params.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contestantId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add contestant to team");
      }
      
      // Update local state
      const updatedTeam = await response.json();
      setTeam(updatedTeam);
      
      // Mark contestant as added
      setContestants(prevContestants => 
        prevContestants.map(contestant => 
          contestant.id === contestantId 
            ? { ...contestant, inTeam: true } 
            : contestant
        )
      );
      
      toast.success(t('team.members.add_success'));
    } catch (error: any) {
      console.error("Error adding contestant to team:", error);
      toast.error(error.message || t('team.members.add_error'));
    } finally {
      setIsAddingMember(false);
    }
  };
  
  // Handle removing a contestant from the team
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      setIsRemoving(true);
      
      const response = await fetch(`/api/participants/teams/${params.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamMemberId: memberToRemove.id }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove contestant from team");
      }
      
      // Update local state
      const updatedTeam = await response.json();
      setTeam(updatedTeam);
      
      // Mark contestant as removed
      setContestants(prevContestants => 
        prevContestants.map(contestant => 
          contestant.id === memberToRemove.contestantId 
            ? { ...contestant, inTeam: false } 
            : contestant
        )
      );
      
      toast.success(t('team.members.remove_success'));
      setConfirmRemoveDialogOpen(false);
    } catch (error: any) {
      console.error("Error removing contestant from team:", error);
      toast.error(error.message || t('team.members.remove_error'));
    } finally {
      setIsRemoving(false);
    }
  };
  
  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    
    // Try to parse the date
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "—";
    }
    
    return date.toLocaleDateString("en-US", {
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
  
  // Format class information based on education level, class grade and class name
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
    
    // For backward compatibility, use the old method if class isn't available
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
    
    // Use real data if available, otherwise use empty values
    const grade = member.classGrade || '';
    const className = member.className || '';
    
    // If we have no grade or class name information, just return the education level
    if (!grade && !className) {
      return educationDisplay;
    }
    
    // Build the class string: prefix + grade + name
    let classString = prefix;
    
    // Add grade if available
    if (grade) {
      classString += ' ' + grade;
    }
    
    // Add class name if available
    if (className) {
      classString += ' ' + className;
    }
    
    // If we only have the prefix, return the full education level instead
    if (classString.trim() === prefix) {
      return educationDisplay;
    }
    
    return classString.trim();
  };
  
  // Original education level formatter for the contestants list
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
          <Link href={`/participants/teams/${params.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('team.members.back_to_team')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t('team.members.title')}</h1>
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
            <h3 className="text-lg font-medium">{t('team.members.not_found')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t('team.members.not_found_description')}
            </p>
            <Button asChild>
              <Link href="/participants/teams">
                {t('team.members.return_to_teams')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : !(team.isOwner === true || team.isManager === true) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t('team.members.permission_denied')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t('team.members.permission_denied_description')}
            </p>
            <Button asChild>
              <Link href={`/participants/teams/${params.id}`}>
                {t('team.members.return_to_details')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>{t('team.members.section_title')}</CardTitle>
                  <CardDescription>
                    {t('team.members.current_members_in')} {team.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex gap-1 items-center">
                    <Users className="h-3 w-3" />
                    {team.members.length} / {team.contestMaxMembers || team.maxMembers}
                  </Badge>
                  
                  {/* Add Member Button */}
                  {team.members.length < (team.contestMaxMembers || team.maxMembers) && (team.isOwner || team.isManager) && (
                    <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('team.members.add_member')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {team.members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">{t('team.members.no_members_yet')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    {t('team.members.no_members_description')}
                  </p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">{t('team.members.name')}</TableHead>
                        <TableHead className="w-[30%]">{t('team.members.class')}</TableHead>
                        <TableHead className="w-[15%]">{t('team.members.gender')}</TableHead>
                        <TableHead className="w-[15%] text-right">{t('team.members.action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="font-medium">{member.contestantName}</div>
                            <div className="text-xs text-muted-foreground">
                              {member.classGrade ? member.classGrade : ''}
                              {member.classGrade && member.className ? ' - ' : ''}
                              {member.className ? member.className : ''}
                              {(member.classGrade || member.className) && member.email ? ' | ' : ''}
                              {member.email ? `${member.email}` : ''}
                            </div>
                          </TableCell>
                          <TableCell>{formatClassInfo(member)}</TableCell>
                          <TableCell>
                            {member.gender ? (
                              <Badge className={getGenderColor(member.gender)}>
                                {member.gender.toUpperCase()}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMemberToRemove(member);
                                setConfirmRemoveDialogOpen(true);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Add Member Dialog */}
          <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{t('team.members.add_dialog_title')}</DialogTitle>
                <DialogDescription>
                  {t('team.members.add_dialog_description')}
                  {team && (team.minAge || team.maxAge) && (
                    <span className="text-xs text-amber-600 mt-1 inline-block">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {t('team.members.age_restrictions')}: 
                      {team.minAge !== undefined && team.maxAge !== undefined ? (
                        ` ${team.minAge} ${t('team.members.to')} ${team.maxAge} ${t('team.members.years_old')}`
                      ) : team.minAge !== undefined ? (
                        ` ${t('team.members.minimum')} ${team.minAge} ${t('team.members.years_old')}`
                      ) : team.maxAge !== undefined ? (
                        ` ${t('team.members.maximum')} ${team.maxAge} ${t('team.members.years_old')}`
                      ) : ''
                      }
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex mb-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('team.members.search_placeholder')}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full"
                  />
                </div>
              </div>
              
              {(isSearching || isLoadingContestants) && (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span>{isSearching ? t('common.searching') : t('common.loading')}</span>
                </div>
              )}
              
              <div className="flex-1 overflow-hidden">
                {team && (team.minAge || team.maxAge || team.targetGroup) && (
                  <div className="bg-blue-50 p-3 rounded-md text-blue-800 text-sm flex items-start mb-4">
                    <Info className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500" />
                    <div>
                      <p className="font-medium">{t('team.members.filtered_by_requirements')}</p>
                      <ul className="list-disc list-inside mt-1">
                        {team.minAge && team.maxAge && (
                          <li>{t('team.members.age_range')}: {team.minAge} {t('team.members.to')} {team.maxAge} {t('team.members.years')}</li>
                        )}
                        {team.minAge && !team.maxAge && (
                          <li>{t('team.members.minimum_age')}: {team.minAge} {t('team.members.years')}</li>
                        )}
                        {!team.minAge && team.maxAge && (
                          <li>{t('team.members.maximum_age')}: {team.maxAge} {t('team.members.years')}</li>
                        )}
                        {team.targetGroup?.educationLevels && team.targetGroup.educationLevels.length > 0 && (
                          <li>{t('team.members.education_levels')}: {team.targetGroup.educationLevels.join(', ')}</li>
                        )}
                        {team.targetGroup?.genders && team.targetGroup.genders.length > 0 && (
                          <li>{t('team.members.gender')}: {team.targetGroup.genders.join(', ')}</li>
                        )}
                      </ul>
                      <p className="mt-1">{t('team.members.only_eligible_shown')}</p>
                    </div>
                  </div>
                )}
                
                {filteredContestants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">{t('team.members.no_contestants_found')}</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      {contestants.length === 0
                        ? t('team.members.no_contestants_created')
                        : t('team.members.no_contestants_match')}
                    </p>
                    {contestants.length === 0 && (
                      <Button asChild onClick={() => setAddMemberDialogOpen(false)}>
                        <Link href="/participants/contestants/new">
                          <Plus className="mr-2 h-4 w-4" />
                          {t('team.members.create_contestant')}
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden h-[400px]">
                    <ScrollArea className="h-full" onScroll={(e) => {
                      const target = e.target as HTMLDivElement;
                      const { scrollTop, scrollHeight, clientHeight } = target;
                      
                      // Load more when scrolled to bottom (with a small buffer)
                      if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingContestants && contestantsPagination.hasMore) {
                        loadMoreContestants();
                      }
                    }}>
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-[60%]">{t('team.members.name')}</TableHead>
                            <TableHead className="w-[40%] text-right">{t('team.members.action')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredContestants.map((contestant) => (
                            <TableRow key={contestant.id}>
                              <TableCell>
                                <div className="font-medium">{contestant.name || "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {contestant.age ? `${t('team.members.age')}: ${contestant.age}` : ''}
                                  {contestant.age && (contestant.class_grade || contestant.class_name) ? ' | ' : ''}
                                  {contestant.class_grade ? `${contestant.class_grade}` : ''}
                                  {contestant.class_grade && contestant.class_name ? ' - ' : ''}
                                  {contestant.class_name ? `${contestant.class_name}` : ''}
                                  {((contestant.class_grade || contestant.class_name) && contestant.email) ? ' | ' : ''}
                                  {contestant.email ? `${contestant.email}` : ''}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {contestant.inTeam ? (
                                  <Badge variant="outline" className="bg-green-50">
                                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                    {t('team.members.added')}
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddMember(contestant.id)}
                                    disabled={isAddingMember || team.members.length >= (team.contestMaxMembers || team.maxMembers)}
                                  >
                                    {isAddingMember ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4 mr-1" />
                                    )}
                                    Add
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </div>
              
              {team.members.length >= (team.contestMaxMembers || team.maxMembers) && (
                <div className="mt-4">
                  <div className="bg-amber-50 p-3 rounded-md text-amber-800 text-sm flex items-start w-full">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
                    <p>
                      {t('team.members.max_size_reached').replace('{maxMembers}', String(team.contestMaxMembers || team.maxMembers))}
                    </p>
                  </div>
                </div>
              )}
              
              <DialogFooter className="space-x-2 mt-4">
                <div className="mr-auto text-sm text-muted-foreground">
                  {t('team.members.contestants_shown')
                    .replace('{shown}', String(filteredContestants.length))
                    .replace('{total}', String(contestantsPagination.totalContestants))}
                </div>
                {contestantsPagination.hasMore && !isLoadingContestants && (
                  <Button 
                    variant="link" 
                    onClick={loadMoreContestants}
                    className="ml-2 p-0 h-auto"
                  >
                    {t('common.load_more')}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
                  {t('team.members.close')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Remove Member Confirmation Dialog */}
          <Dialog open={confirmRemoveDialogOpen} onOpenChange={setConfirmRemoveDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('team.members.remove_dialog_title')}</DialogTitle>
                <DialogDescription>
                  {t('team.members.remove_dialog_description')}
                </DialogDescription>
              </DialogHeader>
              
              {memberToRemove && (
                <div className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{memberToRemove.contestantName}</p>
                      <p className="text-sm text-muted-foreground">
                        {memberToRemove.icNumber || t('team.members.no_ic')}
                      </p>
                      <Badge className={getGenderColor(memberToRemove.gender)} variant="outline">
                        {memberToRemove.gender || t('team.members.no_gender')}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmRemoveDialogOpen(false)}>
                  {t('team.members.cancel')}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveMember}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('team.members.removing')}
                    </>
                  ) : (
                    t('team.members.remove')
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
