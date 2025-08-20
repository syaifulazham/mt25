'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Search, Users, MapPin, CheckCircle, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ContestantsModal from "@/components/custom/contestants-modal";

interface ContingentAttendance {
  id: string;
  contingentId: string;
  contingentName: string;
  state: string;
  teamCount: number;
  contestantCount: number;
  managerCount: number;
  attendanceStatus: string;
  attendanceDate?: string;
  attendanceTime?: string;
}

interface Contestant {
  attendanceContestantId: number;
  contestantId: number;
  attendanceState: string;
  contestantName: string;
  contestantIc: string;
  contestantGender: string;
  contestantAge: number;
  teamId: number;
  teamName: string;
  contestId: number;
  contestName: string;
}

export default function ContingentCheckInPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { toast } = useToast();

  const [contingents, setContingents] = useState<ContingentAttendance[]>([]);
  const [filteredContingents, setFilteredContingents] = useState<ContingentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContingent, setSelectedContingent] = useState<ContingentAttendance | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [loadingContestants, setLoadingContestants] = useState(false);

  // Fetch contingents data
  const fetchContingents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/contingents`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contingents');
      }
      
      const data = await response.json();
      const contingentsArray = Array.isArray(data) ? data : (data.contingents || []);
      setContingents(contingentsArray);
      setFilteredContingents(contingentsArray);
    } catch (error) {
      console.error('Error fetching contingents:', error);
      toast({
        title: "Error",
        description: "Failed to load contingents data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter contingents based on search term and state
  useEffect(() => {
    if (!Array.isArray(contingents)) {
      setFilteredContingents([]);
      return;
    }

    let filtered = contingents;

    // Filter by state
    if (selectedState !== 'all') {
      filtered = filtered.filter(contingent => contingent.state === selectedState);
    }

    // Filter by search term (contingent name)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(contingent => 
        contingent.contingentName.toLowerCase().includes(searchLower)
      );
    }

    setFilteredContingents(filtered);
  }, [contingents, searchTerm, selectedState]);

  // Get unique states for filter dropdown
  const uniqueStates = [...new Set(Array.isArray(contingents) ? contingents.map(c => c.state) : [])].sort();

  // Handle check-in action
  const handleCheckIn = async (contingentId: string) => {
    setCheckingIn(contingentId);
    
    try {
      const response = await fetch(`/api/organizer/events/${params.id}/attendance/contingents/${contingentId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check in contingent');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `${result.contingentName} has been checked in successfully. ${result.updatedRecords} records updated.`,
      });

      // Refresh the contingents list
      fetchContingents();
    } catch (error) {
      console.error('Error checking in contingent:', error);
      toast({
        title: "Error",
        description: "Failed to check in contingent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingIn(null);
    }
  };

  // Handle retract check-in action
  const handleRetractCheckIn = async (contingentId: string) => {
    setCheckingIn(contingentId);
    
    try {
      const response = await fetch(`/api/organizer/events/${params.id}/attendance/contingents/${contingentId}/retract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to retract check-in');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `${result.contingentName} check-in has been retracted. ${result.updatedRecords} records updated.`,
      });

      // Refresh the contingents list
      fetchContingents();
    } catch (error) {
      console.error('Error retracting check-in:', error);
      toast({
        title: "Error",
        description: "Failed to retract check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingIn(null);
    }
  };

  // Handle clicking on a contingent name to show contestants
  const handleContingentClick = async (contingent: ContingentAttendance) => {
    setSelectedContingent(contingent);
    setLoadingContestants(true);
    setContestants([]);
    setIsModalOpen(true);
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/contingents/${contingent.contingentId}/contestants`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contestants');
      }
      
      const data = await response.json();
      setContestants(data.contestants || []);
    } catch (error) {
      console.error('Error fetching contestants:', error);
      toast({
        title: "Error",
        description: "Failed to load contestants data",
        variant: "destructive",
      });
    } finally {
      setLoadingContestants(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchContingents();
  }, [eventId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading contingents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Contestants Modal */}
      {selectedContingent && (
        <ContestantsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          contingentName={selectedContingent.contingentName}
          contestants={contestants}
          loading={loadingContestants}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/organizer/events/${eventId}/attendance`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Contingent Check-in</h1>
          <p className="text-gray-600">Mark all attendance records as present for entire contingents</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Search Contingents</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by contingent name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="state">Filter by State</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredContingents.length} of {contingents.length} contingents
        </p>
      </div>

      {/* Contingents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contingent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teams
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contestants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Managers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContingents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium">No contingents found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredContingents.map((contingent) => (
                    <tr key={contingent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {contingent.attendanceStatus === 'Present' ? (
                          <Button
                            onClick={() => handleRetractCheckIn(contingent.contingentId)}
                            disabled={checkingIn === contingent.contingentId}
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            {checkingIn === contingent.contingentId ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Retracting...
                              </>
                            ) : (
                              'Retract Check-in'
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleCheckIn(contingent.contingentId)}
                            disabled={checkingIn === contingent.contingentId}
                            size="sm"
                          >
                            {checkingIn === contingent.contingentId ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Checking In...
                              </>
                            ) : (
                              'Check In'
                            )}
                          </Button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div 
                          className="text-sm font-medium text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1"
                          onClick={() => handleContingentClick(contingent)}
                        >
                          {contingent.contingentName}
                          <UserRound className="h-4 w-4 ml-1" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{contingent.state}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {contingent.teamCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {contingent.contestantCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {contingent.managerCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={contingent.attendanceStatus === 'Present' ? 'default' : 'secondary'}
                          className={contingent.attendanceStatus === 'Present' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {contingent.attendanceStatus || 'Not Checked In'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
