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
import { School as SchoolIcon, Building, Search, Loader2, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import contingentApi, { School, HigherInstitution } from "./contingent-api";
import { IndependentForm } from "./independent-form";

interface ContingentCreationFormProps {
  userId: number;
  onContingentCreated: () => Promise<void>;
}

export function ContingentCreationForm({ userId, onContingentCreated }: ContingentCreationFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [institutionType, setInstitutionType] = useState<"school" | "independent">("school");
  const [searchResults, setSearchResults] = useState<(School | HigherInstitution)[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<School | HigherInstitution | null>(null);
  const [contingentName, setContingentName] = useState("");
  const [contingentDescription, setContingentDescription] = useState("");
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [existingContingent, setExistingContingent] = useState<boolean>(false);
  const [checkingExistingContingent, setCheckingExistingContingent] = useState<boolean>(false);
  const [independentData, setIndependentData] = useState<any>(null);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    try {
      setIsLoading(true);
      // Only search for schools since higher institutions option was removed
      const schools = await contingentApi.searchSchools(searchQuery);
      setSearchResults(schools);
      setShowSearchDialog(true);
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a contingent already exists for the institution
  const checkExistingContingent = async (institution: School | HigherInstitution, type: "school" | "higher" | "independent") => {
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
    if (institutionType !== 'independent' && !selectedInstitution) {
      toast.error(t('contingent.error_no_institution'));
      return;
    }

    if (!contingentName.trim() && institutionType !== 'independent') {
      toast.error(t('contingent.error_no_name'));
      return;
    }

    if (institutionType === 'independent' && !independentData) {
      toast.error('Please complete the independent contingent form');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create data object based on contingent type
      let data = {};
      
      if (institutionType === 'independent') {
        data = {
          name: independentData.name,
          description: contingentDescription,
          participantId: userId,
          managedByParticipant: true,
          contingentType: 'INDEPENDENT',
          independentData: {
            ...independentData,
            stateId: parseInt(independentData.stateId, 10)
          }
        };
      } else {
        data = {
          name: contingentName,
          description: contingentDescription,
          participantId: userId,
          managedByParticipant: true,
          contingentType: institutionType === "school" ? "SCHOOL" : "HIGHER_INST",
          [institutionType === "school" ? "schoolId" : "higherInstId"]: selectedInstitution?.id,
          managerIds: []
        };
      }

      // Create the contingent
      await fetch('/api/participants/contingents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).then(response => {
        if (!response.ok) {
          throw new Error('Failed to create contingent');
        }
        return response.json();
      });
      
      toast.success(t('contingent.create_success'));
      
      // Add a small delay before fetching contingents to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload contingents
      await onContingentCreated();
      
    } catch (error: any) {
      console.error("Error creating contingent:", error);
      toast.error(error.message || t('contingent.create_error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle request to join contingent
  const handleJoinContingent = async () => {
    if (!selectedInstitution) {
      toast.error(t('contingent.error_no_institution'));
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
      toast.success(t('contingent.join_request_success'));
      
      // Reload contingents
      await onContingentCreated();
      
    } catch (error: any) {
      console.error("Error requesting to join contingent:", error);
      toast.error(error.message || t('contingent.join_request_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{t('contingent.independent_type')}</CardTitle>
        <CardDescription>
          {t('contingent.select_institution_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col space-y-2">
          <Label className="text-sm font-medium">{t('contingent.select_type')}</Label>
          <div className="flex space-x-4">
            <Button 
              type="button"
              variant={institutionType === 'school' ? "default" : "outline"}
              className={`flex-1 justify-start py-6 ${institutionType === 'school' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => {
                setInstitutionType("school");
                setSelectedInstitution(null);
                setContingentName("");
              }}
            >
              <div className="flex flex-col items-center w-full">
                <SchoolIcon className={`h-6 w-6 mb-2 ${institutionType === 'school' ? 'text-white' : 'text-blue-600'}`} />
                <span className={`${institutionType === 'school' ? 'text-white' : ''}`}>{t('contingent.school')}</span>
              </div>
            </Button>
            <Button 
              type="button"
              variant={institutionType === 'independent' ? "default" : "outline"}
              className={`flex-1 justify-start py-6 ${institutionType === 'independent' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={() => {
                setInstitutionType("independent");
                setSelectedInstitution(null);
                setContingentName("");
              }}
            >
              <div className="flex flex-col items-center w-full">
                <Users className={`h-6 w-6 mb-2 ${institutionType === 'independent' ? 'text-white' : 'text-green-600'}`} />
                <span className={`${institutionType === 'independent' ? 'text-white' : ''}`}>{t('contingent.independent')}</span>
              </div>
            </Button>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {institutionType === 'school' && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder={t('contingent.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button type="button" onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t('contingent.search')}
              </Button>
            </div>

            {selectedInstitution && (
              <>
                <div className="p-4 border rounded-md bg-muted">
                  <h3 className="font-medium mb-1">
                    {t('contingent.selected_school')}
                  </h3>
                  <p className="text-lg">{selectedInstitution.name}</p>
                  {'ppd' in selectedInstitution && selectedInstitution.ppd ? (
                    <p className="text-sm text-muted-foreground">{String(selectedInstitution.ppd)}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {'state' in selectedInstitution && selectedInstitution.state ? 
                      String(selectedInstitution.state.name) : ''}
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contingentName">{t('contingent.name')}</Label>
                    <Input
                      id="contingentName"
                      value={contingentName}
                      onChange={(e) => setContingentName(e.target.value)}
                      placeholder={t('contingent.name_placeholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contingentDescription">{t('contingent.description')}</Label>
                    <Input
                      id="contingentDescription"
                      value={contingentDescription}
                      onChange={(e) => setContingentDescription(e.target.value)}
                      placeholder={t('contingent.description_placeholder')}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {institutionType === 'independent' && (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                {t('contingent.independent_desc')}
              </p>
            </div>
            <IndependentForm 
              onSubmit={(data) => {
                setIndependentData(data);
                setContingentName(data.name);
                toast.success(t('contingent.independent_saved'));
              }} 
              isLoading={isLoading} 
              initialData={independentData as any} 
            />
          </>
        )}

        {/* Second set of name/description fields removed to prevent duplication */}
      </CardContent>
      
      {/* Card footer for independent form */}
      {institutionType === 'independent' && independentData && (
        <CardFooter className="flex justify-end">
          <Button onClick={handleCreateContingent} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : t('contingent.create_new')}
          </Button>
        </CardFooter>
      )}
      
      {/* Card footer for school form */}
      {selectedInstitution && (
        <CardFooter className="flex flex-col space-y-4">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => setSelectedInstitution(null)}>
              {t('contingent.clear_selection')}
            </Button>
            
            <div className="space-x-2">
              {checkingExistingContingent ? (
                <Button disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('contingent.checking')}
                </Button>
              ) : existingContingent ? (
                <div className="text-right space-y-2">
                  <div className="text-sm text-amber-500 font-medium">
                    {t('contingent.already_exists')}
                  </div>
                  <Button onClick={handleJoinContingent} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : t('contingent.join_existing')}
                  </Button>
                </div>
              ) : (
                <div className="space-x-2">
                  <Button variant="outline" onClick={handleJoinContingent} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : t('contingent.request_join')}
                  </Button>
                  <Button onClick={handleCreateContingent} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : t('contingent.create_new')}
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
