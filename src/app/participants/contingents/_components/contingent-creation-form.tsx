"use client";

import { useState, useEffect } from "react";
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
import { useCheckPendingRequests } from "./check-pending-requests";
import { PendingRequestDisplay } from "./pending-request-display";

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
  const [contingentManagerInfo, setContingentManagerInfo] = useState<{
    contingentName?: string;
    primaryManager?: {
      id: number;
      name: string;
      email: string;
      phoneNumber: string | null;
    } | null;
    otherManagers?: Array<{
      id: number;
      name: string;
      email: string;
      phoneNumber: string | null;
    }> | null;
  } | null>(null);
  const [checkingExistingContingent, setCheckingExistingContingent] = useState<boolean>(false);
  const [independentData, setIndependentData] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [checkingPendingRequest, setCheckingPendingRequest] = useState<boolean>(false);
  
  // Use the hook to check for pending contingent requests
  useCheckPendingRequests(userId, setPendingRequest, setCheckingPendingRequest);

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
      
      if (data.exists) {
        setContingentManagerInfo({
          contingentName: data.contingentName,
          primaryManager: data.primaryManager,
          otherManagers: data.otherManagers
        });
      } else {
        setContingentManagerInfo(null);
      }
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
      let data: any = {};
      
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
      } else if (selectedInstitution) {
        data = {
          name: contingentName,
          description: contingentDescription,
          participantId: userId,
          managedByParticipant: true,
          contingentType: institutionType === "school" ? "SCHOOL" : "HIGHER_INST",
          [institutionType === "school" ? "schoolId" : "higherInstId"]: selectedInstitution.id,
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
        participantId: userId,
        institutionType: institutionType === "school" ? "SCHOOL" : "HIGHER_INSTITUTION",
        institutionId: selectedInstitution.id
      };
      
      await contingentApi.requestToJoinContingent(data);
      toast.success(t('contingent.join_request_success'));
      
      // Reload contingents to reflect the new pending request
      await onContingentCreated();
      
      // Refresh the pending request status
      const pendingRequests = await contingentApi.getUserPendingRequests(userId);
      if (pendingRequests && pendingRequests.length > 0) {
        setPendingRequest(pendingRequests[0]);
      }
      
    } catch (error: any) {
      console.error("Error requesting to join contingent:", error);
      toast.error(error.message || t('contingent.join_request_error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking for pending requests
  if (checkingPendingRequest) {
    return (
      <div className="w-full max-w-3xl mx-auto flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t("common.loading")}</span>
      </div>
    );
  }
  
  // Show pending request details if available
  if (pendingRequest) {
    return (
      <PendingRequestDisplay 
        pendingRequest={pendingRequest}
        onCancelSuccess={() => {
          setPendingRequest(null);
          onContingentCreated();
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle>
            {institutionType === "independent"
              ? t("contingent.independent_type")
              : t("contingent.create")}
          </CardTitle>
          <CardDescription>
            {institutionType === "independent"
              ? t("contingent.independent_intro")
              : t("contingent.intro")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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
                        handleSearch();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={handleSearch} 
                    disabled={isLoading || !searchQuery.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">{t('contingent.search')}</span>
                  </Button>
                </div>
                
                {selectedInstitution && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">{t('contingent.selected_institution')}</h3>
                    <p>{selectedInstitution.name}</p>
                    {selectedInstitution.state && (
                      <p className="text-sm text-gray-500">
                        {selectedInstitution.state.name}
                      </p>
                    )}
                  </div>
                )}
                
                {selectedInstitution && (
                  <>
                    {checkingExistingContingent ? (
                      <div className="flex justify-center my-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">{t('contingent.checking_existing')}</span>
                      </div>
                    ) : existingContingent ? (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <h3 className="font-medium text-blue-800 mb-2">{t('contingent.existing_contingent')}</h3>
                        <p className="text-blue-700 mb-3">
                          {t('contingent.contingent_exists').replace('{name}', contingentManagerInfo?.contingentName || t('contingent.unknown'))}
                        </p>
                        
                        {contingentManagerInfo?.primaryManager && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-blue-800">{t('contingent.contact_manager')}</h4>
                            <div className="bg-white p-3 rounded-md mt-1 border border-blue-100">
                              <p className="font-medium">{contingentManagerInfo.primaryManager.name}</p>
                              <p className="text-sm">{contingentManagerInfo.primaryManager.email}</p>
                              {contingentManagerInfo.primaryManager.phoneNumber && (
                                <p className="text-sm">{contingentManagerInfo.primaryManager.phoneNumber}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <Button
                          type="button"
                          onClick={handleJoinContingent}
                          disabled={isLoading}
                          className="mt-2"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('common.processing')}
                            </>
                          ) : (
                            t('contingent.request_to_join')
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="contingentName">{t('contingent.name')}</Label>
                          <Input 
                            id="contingentName"
                            value={contingentName}
                            onChange={(e) => setContingentName(e.target.value)}
                            placeholder={t('contingent.name_placeholder')}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contingentDescription">{t('contingent.description')}</Label>
                          <Input 
                            id="contingentDescription"
                            value={contingentDescription}
                            onChange={(e) => setContingentDescription(e.target.value)}
                            placeholder={t('contingent.description_placeholder')}
                            className="mt-1"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleCreateContingent}
                          disabled={isLoading || !contingentName.trim()}
                          className="w-full mt-4"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('common.processing')}
                            </>
                          ) : (
                            t('contingent.create_button')
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            
            {institutionType === 'independent' && (
              <IndependentForm 
                onSubmit={(data) => {
                  setIndependentData(data);
                  handleCreateContingent();
                }}
                isLoading={isLoading}
                initialData={{ name: contingentDescription }}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Search results dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('contingent.search_results')}</DialogTitle>
            <DialogDescription>
              {searchResults.length > 0 
                ? t('contingent.select_institution') 
                : t('contingent.no_results')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {searchResults.length > 0 ? (
              searchResults.map((institution) => (
                <div 
                  key={`${institution.id}-${institutionType}`}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectInstitution(institution)}
                >
                  <div className="flex items-start">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 mr-3">
                      {/* Determine the icon based on whether it's a School or HigherInstitution */}
                      {'level' in institution 
                        ? <SchoolIcon className="h-4 w-4" /> 
                        : <Building className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-medium">{institution.name}</h4>
                      {institution.state && (
                        <p className="text-sm text-gray-500">
                          {institution.state.name}
                          {'city' in institution && institution.city ? `, ${institution.city}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t('contingent.no_institutions_found')}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSearchDialog(false)}
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
