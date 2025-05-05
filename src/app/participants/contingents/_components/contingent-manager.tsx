"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, School, Building, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// API client for contingent management
const contingentApi = {
  // Get participant's contingents
  async getUserContingents(participantId: number) {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const response = await fetch(`/api/participants/contingents?participantId=${participantId}&t=${timestamp}`, {
      // Add cache: 'no-store' to prevent caching issues
      cache: 'no-store',
      // Add cache control headers to bypass cache
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    if (!response.ok) {
      // Try fallback API if main API fails
      console.log('Main API failed, trying fallback...');
      const fallbackResponse = await fetch(`/api/participants/contingents/fallback?participantId=${participantId}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (fallbackResponse.ok) {
        return fallbackResponse.json();
      }
      
      throw new Error('Failed to fetch contingents');
    }
    return response.json();
  },

  // Search schools
  async searchSchools(query: string) {
    const response = await fetch(`/api/schools?search=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search schools');
    }
    return response.json();
  },

  // Search higher institutions
  async searchHigherInstitutions(query: string) {
    const response = await fetch(`/api/higher-institutions?search=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search higher institutions');
    }
    return response.json();
  },

  // Create a new contingent
  async createContingent(data: any) {
    console.log('Creating contingent with data:', data);
    
    // If managerIds is not provided, initialize it as an empty array
    if (!data.managerIds) {
      data.managerIds = [];
    }
    
    // Add a retry mechanism for contingent creation
    let retries = 3;
    let response;
    let responseData;
    
    while (retries > 0) {
      try {
        response = await fetch('/api/participants/contingents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        responseData = await response.json();
        console.log('API response:', responseData);
        
        if (response.ok) {
          break; // Success, exit the retry loop
        } else {
          throw new Error(responseData.error || 'Failed to create contingent');
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error; // Rethrow the error after all retries fail
        }
        console.log(`Retrying contingent creation... ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }
    
    return responseData;
  },

  // Request to join a contingent
  async requestToJoinContingent(data: any) {
    const response = await fetch('/api/participants/contingent-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to request joining contingent');
    }
    
    return response.json();
  },

  // Get pending requests for a contingent
  async getContingentRequests(contingentId: number) {
    const response = await fetch(`/api/participants/contingent-requests?contingentId=${contingentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch contingent requests');
    }
    return response.json();
  },

  // Approve or reject a contingent request
  async updateContingentRequest(requestId: number, status: 'APPROVED' | 'REJECTED') {
    const response = await fetch(`/api/participants/contingent-requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update request');
    }
    
    return response.json();
  }
};

// Types
interface School {
  id: number;
  name: string;
  code: string;
  level: string;
  category: string;
  state: {
    name: string;
  };
}

interface HigherInstitution {
  id: number;
  name: string;
  code: string;
  state: {
    name: string;
  };
}

interface Contingent {
  id: number;
  name: string;
  description: string;
  school: School | null;
  higherInstitution: HigherInstitution | null;
  isManager: boolean;
  isOwner: boolean;
  status: 'ACTIVE' | 'PENDING';
  memberCount: number;
  managerCount?: number;
}

interface ContingentRequest {
  id: number;
  userId: number;
  contingentId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface ContingentManagerProps {
  userId: number;
}

export default function ContingentManager({ userId }: ContingentManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [institutionType, setInstitutionType] = useState<"school" | "higher">("school");
  const [searchResults, setSearchResults] = useState<(School | HigherInstitution)[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<School | HigherInstitution | null>(null);
  const [contingentName, setContingentName] = useState("");
  const [contingentDescription, setContingentDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userContingents, setUserContingents] = useState<Contingent[]>([]);
  const [contingentRequests, setContingentRequests] = useState<ContingentRequest[]>([]);
  const [selectedContingent, setSelectedContingent] = useState<Contingent | null>(null);

  // Load user's contingents on component mount
  useEffect(() => {
    const loadUserContingents = async () => {
      try {
        setIsLoading(true);
        const contingents = await contingentApi.getUserContingents(userId);
        setUserContingents(contingents);
        
        // If user has contingents, switch to manage tab
        if (contingents.length > 0) {
          setActiveTab("manage");
          
          // Select the first contingent where user is manager
          const managerContingent = contingents.find((c: Contingent) => c.isManager);
          if (managerContingent) {
            setSelectedContingent(managerContingent);
            // Load contingent requests if user is a manager
            loadContingentRequests(managerContingent.id);
          } else {
            setSelectedContingent(contingents[0]);
          }
        }
      } catch (error) {
        console.error("Error loading contingents:", error);
        toast.error("Failed to load your contingents");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserContingents();
  }, [userId]);

  // Load contingent requests
  const loadContingentRequests = async (contingentId: number) => {
    try {
      setIsLoading(true);
      const requests = await contingentApi.getContingentRequests(contingentId);
      setContingentRequests(requests);
    } catch (error) {
      console.error("Error loading contingent requests:", error);
      toast.error("Failed to load contingent requests");
    } finally {
      setIsLoading(false);
    }
  };
  
  // This function was removed to avoid duplication with the existing handleUpdateRequest function below

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    try {
      setIsLoading(true);
      if (institutionType === "school") {
        const schools = await contingentApi.searchSchools(searchQuery);
        setSearchResults(schools);
      } else {
        const institutions = await contingentApi.searchHigherInstitutions(searchQuery);
        setSearchResults(institutions);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle institution selection
  const handleSelectInstitution = (institution: School | HigherInstitution) => {
    setSelectedInstitution(institution);
    // Generate a default contingent name
    setContingentName(`${institution.name} Contingent`);
  };

  // Handle contingent creation
  const handleCreateContingent = async () => {
    if (!selectedInstitution) {
      toast.error("Please select a school or institution");
      return;
    }

    if (!contingentName.trim()) {
      toast.error("Please enter a contingent name");
      return;
    }

    try {
      setIsLoading(true);
      // Create data object with support for multiple managers
      const data = {
        name: contingentName,
        description: contingentDescription,
        participantId: userId, // The participant who creates the contingent
        managedByParticipant: true, // Mark as managed by participant
        institutionType: institutionType === "school" ? "SCHOOL" : "HIGHER_INSTITUTION",
        institutionId: selectedInstitution.id,
        managerIds: [] // Initialize empty array for additional managers
      };

      // Create the contingent
      const newContingent = await contingentApi.createContingent(data);
      toast.success("Contingent created successfully");
      
      // Add a small delay before fetching contingents to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Reload contingents and switch to manage tab
        const contingents = await contingentApi.getUserContingents(userId);
        setUserContingents(contingents);
        setActiveTab("manage");
      } catch (fetchError) {
        console.error("Error fetching contingents after creation:", fetchError);
        // Even if fetching fails, we'll still switch to manage tab and show what we have
        // The user can refresh the page to see the new contingent
        setActiveTab("manage");
        
        // Add the newly created contingent to the list manually
        if (newContingent) {
          const manuallyAddedContingent: Contingent = {
            id: newContingent.id,
            name: contingentName,
            description: contingentDescription || "",
            school: institutionType === "school" ? selectedInstitution as School : null,
            higherInstitution: institutionType === "higher" ? selectedInstitution as HigherInstitution : null,
            isManager: true,
            isOwner: true,
            status: "ACTIVE",
            memberCount: 0,
            managerCount: 1
          };
          
          setUserContingents(prev => [...prev, manuallyAddedContingent]);
        }
      }
      
      // Clear form
      setSelectedInstitution(null);
      setContingentName("");
      setContingentDescription("");
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      console.error("Error creating contingent:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast.error(error.message || "Failed to create contingent");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle request to join contingent
  const handleJoinContingent = async () => {
    if (!selectedInstitution) {
      toast.error("Please select a school or institution");
      return;
    }

    try {
      setIsLoading(true);
      const data = {
        participantId: userId, // Use the participantId parameter required by the API schema
        institutionType: institutionType === "school" ? "SCHOOL" : "HIGHER_INSTITUTION",
        institutionId: selectedInstitution.id
      };
      
      console.log('Requesting to join contingent with data:', data);

      await contingentApi.requestToJoinContingent(data);
      toast.success("Request to join contingent submitted successfully");
      
      // Reload contingents and switch to manage tab
      const contingents = await contingentApi.getUserContingents(userId);
      setUserContingents(contingents);
      setActiveTab("manage");
      
      // Clear form
      setSelectedInstitution(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      console.error("Error requesting to join contingent:", error);
      toast.error(error.message || "Failed to request joining contingent");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle request update (approve/reject)
  const handleUpdateRequest = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      setIsLoading(true);
      await contingentApi.updateContingentRequest(requestId, status);
      
      // Reload requests
      if (selectedContingent) {
        await loadContingentRequests(selectedContingent.id);
        
        // If a request was approved, also reload the user's contingents to reflect any changes
        if (status === 'APPROVED') {
          const updatedContingents = await contingentApi.getUserContingents(userId);
          setUserContingents(updatedContingents);
        }
      }
      
      toast.success(`Request ${status.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="select">Select Contingent</TabsTrigger>
        <TabsTrigger value="manage">Manage Contingent</TabsTrigger>
      </TabsList>
      
      {/* Select Contingent Tab */}
      <TabsContent value="select" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select Your Institution</CardTitle>
            <CardDescription>
              Search for your school or higher institution to create or join a contingent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup 
              defaultValue="school" 
              value={institutionType}
              onValueChange={(value: string) => setInstitutionType(value as "school" | "higher")}
              className="flex flex-row space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="school" id="school" />
                <Label htmlFor="school" className="flex items-center gap-1">
                  <School className="h-4 w-4" /> School
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="higher" id="higher" />
                <Label htmlFor="higher" className="flex items-center gap-1">
                  <Building className="h-4 w-4" /> Higher Institution
                </Label>
              </div>
            </RadioGroup>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder={`Search for ${institutionType === "school" ? "school" : "higher institution"} by name, code, or location`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button onClick={handleSearch} disabled={isLoading}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </DialogTrigger>
                {searchResults.length > 0 && (
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Search Results ({searchResults.length})</DialogTitle>
                      <DialogDescription>
                        Select an institution to create a contingent
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-y-auto">
                      {searchResults.map((institution) => (
                        <div 
                          key={institution.id} 
                          className={`p-3 border-b last:border-0 hover:bg-accent cursor-pointer ${selectedInstitution?.id === institution.id ? 'bg-accent' : ''}`}
                          onClick={() => {
                            handleSelectInstitution(institution);
                            // Close the dialog by simulating a click on the close button
                            document.querySelector('[data-state="open"] [aria-label="Close"]')?.dispatchEvent(
                              new MouseEvent('click', { bubbles: true })
                            );
                          }}
                        >
                          <div className="font-medium">{institution.name}</div>
                          <div className="text-sm text-muted-foreground flex justify-between">
                            <span>Code: {institution.code}</span>
                            <span>{(institution as any).state?.name || 'Unknown location'}</span>
                          </div>
                          {institutionType === "school" && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {(institution as School).level} | {(institution as School).category}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <DialogFooter className="sm:justify-start">
                      <div className="text-xs text-muted-foreground">
                        Click on an institution to select it
                      </div>
                    </DialogFooter>
                  </DialogContent>
                )}
              </Dialog>
            </div>
            
            {selectedInstitution && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Selected Institution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-medium">{selectedInstitution.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {institutionType === "school" ? "School" : "Higher Institution"} | {selectedInstitution.code}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {selectedInstitution && (
              <div className="space-y-4">
                <Separator />
                <div>
                  <h3 className="text-lg font-medium mb-2">Contingent Details</h3>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contingent-name">Contingent Name</Label>
                      <Input
                        id="contingent-name"
                        placeholder="Enter contingent name"
                        value={contingentName}
                        onChange={(e) => setContingentName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contingent-description">Description (Optional)</Label>
                      <Input
                        id="contingent-description"
                        placeholder="Brief description of your contingent"
                        value={contingentDescription}
                        onChange={(e) => setContingentDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {selectedInstitution && (
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setSelectedInstitution(null)}>
                Clear Selection
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={handleJoinContingent} disabled={isLoading}>
                  Request to Join Existing
                </Button>
                <Button onClick={handleCreateContingent} disabled={isLoading}>
                  Create New Contingent
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </TabsContent>
      
      {/* Manage Contingent Tab */}
      <TabsContent value="manage" className="space-y-4">
        {userContingents.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Contingents</CardTitle>
              <CardDescription>
                You are not part of any contingent yet. Go to the Select Contingent tab to create or join one.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setActiveTab("select")}>Select Contingent</Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your Contingents</CardTitle>
                  <CardDescription>
                    Select a contingent to manage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userContingents.map((contingent) => (
                      <div 
                        key={contingent.id}
                        className={`p-3 border rounded-md cursor-pointer hover:border-primary ${selectedContingent?.id === contingent.id ? 'border-primary bg-accent' : ''}`}
                        onClick={() => {
                          setSelectedContingent(contingent);
                          if (contingent.isManager) {
                            loadContingentRequests(contingent.id);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium">{contingent.school?.name || contingent.higherInstitution?.name}</div>
                          {contingent.isManager && (
                            <Badge variant="outline">
                              {contingent.isOwner ? 'Primary Manager' : 'Co-Manager'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                          <span>{contingent.memberCount} members</span>
                          {contingent.status === 'PENDING' && (
                            <Badge variant="secondary">Pending Approval</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab("select")}>
                    Join Another Contingent
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              {selectedContingent ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{selectedContingent.school?.name || selectedContingent.higherInstitution?.name}</CardTitle>
                        <CardDescription>
                          {selectedContingent.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      {selectedContingent.status === 'PENDING' && (
                        <Badge variant="secondary">Pending Approval</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Manage Contestants Button */}
                    {selectedContingent.isManager && selectedContingent.status === 'ACTIVE' && (
                      <div className="mt-2">
                        <Button 
                          onClick={() => router.push(`/participants/contingents/${selectedContingent.id}`)}
                          className="w-full"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Manage Contestants
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Register and manage contestants for your contingent
                        </p>
                      </div>
                    )}
                    
                    <Separator />
                    
                    {/* Contingent Requests (if user is manager) - any manager can approve/reject requests */}
                    {selectedContingent?.isManager && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold">Pending Requests</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {selectedContingent.isOwner 
                            ? "As the primary manager, you can approve or reject requests from users who want to join your contingent"
                            : "As a co-manager, you can approve or reject requests from users who want to join this contingent"}
                        </p>
                        
                        {contingentRequests.length === 0 ? (
                          <div className="p-4 border rounded-md bg-muted/50 text-center">
                            <p>No pending requests</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {contingentRequests.map((request) => (
                              <div key={request.id} className="p-4 border rounded-md flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{request.user.name}</p>
                                  <p className="text-sm text-muted-foreground">{request.user.email}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      Requested {new Date(request.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8"
                                    onClick={() => handleUpdateRequest(request.id, 'REJECTED')}
                                    disabled={isLoading}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="h-8"
                                    onClick={() => handleUpdateRequest(request.id, 'APPROVED')}
                                    disabled={isLoading}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!selectedContingent.isManager && selectedContingent.status === 'PENDING' && (
                      <div className="flex flex-col text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{selectedContingent.memberCount} members</span>
                        </div>
                        {selectedContingent.managerCount && selectedContingent.managerCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{selectedContingent.managerCount} managers</span>
                          </div>
                        )}
                        <p className="font-medium">Waiting for approval</p>
                        <p className="text-sm">Your request to join this contingent is pending approval from the contingent manager.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Select a Contingent</CardTitle>
                    <CardDescription>
                      Please select a contingent from the list to view its details
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
