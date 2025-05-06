"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { School as SchoolIcon, Building, Search, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import contingentApi, { School, HigherInstitution } from "./contingent-api";

interface ContingentCreationFormProps {
  userId: number;
  onContingentCreated: () => Promise<void>;
}

export function ContingentCreationForm({ userId, onContingentCreated }: ContingentCreationFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [institutionType, setInstitutionType] = useState<"school" | "higher">("school");
  const [searchResults, setSearchResults] = useState<(School | HigherInstitution)[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<School | HigherInstitution | null>(null);
  const [contingentName, setContingentName] = useState("");
  const [contingentDescription, setContingentDescription] = useState("");
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [existingContingent, setExistingContingent] = useState<boolean>(false);
  const [checkingExistingContingent, setCheckingExistingContingent] = useState<boolean>(false);

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
      setShowSearchDialog(true);
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a contingent already exists for the institution
  const checkExistingContingent = async (institution: School | HigherInstitution, type: "school" | "higher") => {
    try {
      setCheckingExistingContingent(true);
      const institutionId = institution.id;
      const institutionType = type === "school" ? "SCHOOL" : "HIGHER_INSTITUTION";
      
      // Use the API to check if a contingent exists
      const response = await fetch(
        `/api/participants/contingents/check?institutionType=${institutionType}&institutionId=${institutionId}`,
        { cache: 'no-store' }
      );
      
      if (!response.ok) {
        throw new Error("Failed to check existing contingent");
      }
      
      const data = await response.json();
      setExistingContingent(data.exists);
    } catch (error) {
      console.error("Error checking existing contingent:", error);
      // Default to false if error
      setExistingContingent(false);
    } finally {
      setCheckingExistingContingent(false);
    }
  };

  // Handle institution selection
  const handleSelectInstitution = async (institution: School | HigherInstitution) => {
    setSelectedInstitution(institution);
    setShowSearchDialog(false);
    // Generate a default contingent name
    setContingentName(`${institution.name} Contingent`);
    
    // Check if a contingent already exists for this institution
    await checkExistingContingent(institution, institutionType);
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
      await contingentApi.createContingent(data);
      toast.success("Contingent created successfully");
      
      // Add a small delay before fetching contingents to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload contingents
      await onContingentCreated();
      
    } catch (error: any) {
      console.error("Error creating contingent:", error);
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
      
      await contingentApi.requestToJoinContingent(data);
      toast.success("Request to join contingent submitted successfully");
      
      // Reload contingents
      await onContingentCreated();
      
    } catch (error: any) {
      console.error("Error requesting to join contingent:", error);
      toast.error(error.message || "Failed to request joining contingent");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Select Your Institution</CardTitle>
        <CardDescription>
          Search for your school or higher institution to create or join a contingent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <RadioGroup 
          defaultValue="school" 
          value={institutionType}
          onValueChange={(value: string) => setInstitutionType(value as "school" | "higher")}
          className="flex flex-row space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="school" id="school" />
            <Label htmlFor="school" className="flex items-center gap-1">
              <SchoolIcon className="h-4 w-4" /> School
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
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
              {institutionType === "school" && (
                <div className="text-xs text-muted-foreground mt-1">
                  {(selectedInstitution as School).level} | {(selectedInstitution as School).category}
                </div>
              )}
              {selectedInstitution.state && (
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedInstitution.state.name}
                </div>
              )}
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
        <CardFooter className="flex flex-col space-y-4">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => setSelectedInstitution(null)}>
              Clear Selection
            </Button>
            
            <div className="space-x-2">
              {checkingExistingContingent ? (
                <Button disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </Button>
              ) : existingContingent ? (
                <div className="text-right space-y-2">
                  <div className="text-sm text-amber-500 font-medium">
                    A contingent already exists for this institution
                  </div>
                  <Button onClick={handleJoinContingent} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : "Request to Join Existing Contingent"}
                  </Button>
                </div>
              ) : (
                <div className="space-x-2">
                  <Button variant="outline" onClick={handleJoinContingent} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : "Request to Join Existing"}
                  </Button>
                  <Button onClick={handleCreateContingent} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : "Create New Contingent"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardFooter>
      )}

      {/* Search Results Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Results ({searchResults.length})</DialogTitle>
            <DialogDescription>
              Select an institution to create a contingent
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No results found. Try a different search term.
              </div>
            ) : (
              searchResults.map((institution) => (
                <div 
                  key={institution.id} 
                  className="p-3 border-b last:border-0 hover:bg-accent cursor-pointer"
                  onClick={() => handleSelectInstitution(institution)}
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
              ))
            )}
          </div>
          <DialogFooter className="sm:justify-start">
            <Button variant="outline" onClick={() => setShowSearchDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
