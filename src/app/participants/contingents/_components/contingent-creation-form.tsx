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
  const [pendingJoinRequest, setPendingJoinRequest] = useState<{
    hasPendingRequest: boolean;
    requestId?: number;
    contingentId?: number;
    contingentName?: string;
    contingentType?: string;
    institutionName?: string;
    primaryManager?: {
      id: number;
      name: string;
      email: string;
      phoneNumber: string | null;
    } | null;
  } | null>(null);
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
  const [cancellingRequest, setCancellingRequest] = useState<boolean>(false);
  const [independentData, setIndependentData] = useState<any>(null);

  // Check for pending join requests on component mount
  useEffect(() => {
    const checkPendingJoinRequests = async () => {
      try {
        const response = await contingentApi.checkPendingJoinRequest(userId);
        setPendingJoinRequest(response);
      } catch (error) {
        console.error('Error checking pending join requests:', error);
        // Don't show error toast as this is a background check
      }
    };

    checkPendingJoinRequests();
  }, [userId]);

  // Cancel a pending join request
  const handleCancelJoinRequest = async () => {
    if (!pendingJoinRequest?.requestId) {
      toast.error(t('contingent.error_no_request_id'));
      return;
    }

    try {
      setCancellingRequest(true);
      await contingentApi.cancelJoinRequest(pendingJoinRequest.requestId);
      toast.success(t('contingent.cancel_request_success'));
      setPendingJoinRequest(null);
    } catch (error: any) {
      console.error('Error cancelling join request:', error);
      toast.error(error.message || t('contingent.cancel_request_error'));
    } finally {
      setCancellingRequest(false);
    }
  };

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
  const checkExistingContingent = async (institution: School | HigherInstitution) => {
    try {
      setCheckingExistingContingent(true);
      const institutionId = institution.id;
      const institutionType = "SCHOOL";
      
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
    await checkExistingContingent(institution);
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
      let payload: any = {};
      
      if (institutionType === 'independent') {
        payload = {
          name: independentData.name,
          description: contingentDescription,
          participantId: userId,
          type: "INDEPENDENT",
          independentData
        };
      } else {
        payload = {
          name: contingentName,
          description: contingentDescription,
          participantId: userId,
          institutionId: selectedInstitution!.id,
          type: "SCHOOL"
        };
      }

      await contingentApi.createContingent(payload);
      toast.success(t('contingent.create_success'));
      await onContingentCreated();
      router.push("/participants/contingents");
    } catch (error: any) {
      console.error("Error creating contingent:", error);
      toast.error(error.message || t('contingent.create_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinContingent = async () => {
    if (!selectedInstitution) {
      toast.error(t('contingent.error_no_institution'));
      return;
    }

    try {
      setIsLoading(true);
      await contingentApi.requestJoinContingent({
        participantId: userId,
        institutionId: selectedInstitution.id,
        type: "SCHOOL",
      });
      toast.success(t('contingent.join_request_success'));
      router.push("/participants/contingents");
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
        <CardTitle>
          {pendingJoinRequest?.hasPendingRequest 
            ? t('contingent.pending_request_title') 
            : t('contingent.independent_type')}
        </CardTitle>
        <CardDescription>
          {pendingJoinRequest?.hasPendingRequest 
            ? t('contingent.pending_request_desc')
            : t('contingent.select_institution_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {pendingJoinRequest?.hasPendingRequest ? (
          <div className="space-y-5">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-left">
              <h4 className="font-medium text-amber-800 mb-2">
                {t('contingent.pending_request_for')} {pendingJoinRequest.contingentName}
              </h4>
              
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-amber-700">{t('contingent.institution')}:</h5>
                <p className="pl-2 border-l-2 border-amber-300 ml-1 mt-1 text-sm">
                  {pendingJoinRequest.institutionName}
                </p>
              </div>
              
              {pendingJoinRequest.primaryManager && (
                <div className="mb-3">
                  <h5 className="text-sm font-semibold text-amber-700">{t('contingent.primary_manager')}:</h5>
                  <div className="pl-2 border-l-2 border-amber-300 ml-1 mt-1">
                    <p className="text-sm font-medium">{pendingJoinRequest.primaryManager.name}</p>
                    <p className="text-xs text-gray-600">{pendingJoinRequest.primaryManager.email}</p>
                    {pendingJoinRequest.primaryManager.phoneNumber && (
                      <p className="text-xs text-gray-600">{pendingJoinRequest.primaryManager.phoneNumber}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="text-sm text-amber-600 mt-4">
                {t('contingent.pending_request_info')}
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="destructive" 
                onClick={handleCancelJoinRequest} 
                disabled={cancellingRequest}
              >
                {cancellingRequest ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('contingent.cancelling')}
                  </>
                ) : t('contingent.cancel_request')}
              </Button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
      
      {/* Card footer for independent form */}
      {institutionType === 'independent' && independentData && !pendingJoinRequest?.hasPendingRequest && (
        <CardFooter className="flex justify-end">
          <Button onClick={handleCreateContingent} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : t('contingent.create_new')}
          </Button>
        </CardFooter>
      )}
      
      {/* Card footer for school form */}
      {selectedInstitution && !pendingJoinRequest?.hasPendingRequest && (
        <CardFooter className="flex flex-col space-y-4">
          <div className={`${existingContingent ? 'flex flex-col' : 'flex justify-between'} w-full`}>
            <Button variant="outline" onClick={() => setSelectedInstitution(null)} className={existingContingent ? 'mb-4' : ''}>
              {t('contingent.clear_selection')}
            </Button>
            
            <div className="space-x-2">
              {checkingExistingContingent ? (
                <Button disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('contingent.checking')}
                </Button>
              ) : existingContingent ? (
                <div className="space-y-3 w-full">
                  <div className="text-sm text-amber-500 font-medium text-center font-bold mb-2">
                    {t('contingent.already_exists')}
                  </div>
                  
                  {contingentManagerInfo && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-left">
                      <h4 className="font-medium text-amber-800 mb-2">Contingent: {contingentManagerInfo.contingentName}</h4>
                      
                      {contingentManagerInfo.primaryManager && (
                        <div className="mb-3">
                          <h5 className="text-sm font-semibold text-amber-700">Primary Manager:</h5>
                          <div className="pl-2 border-l-2 border-amber-300 ml-1 mt-1">
                            <p className="text-sm font-medium">{contingentManagerInfo.primaryManager.name}</p>
                            <p className="text-xs text-gray-600">{contingentManagerInfo.primaryManager.email}</p>
                            {contingentManagerInfo.primaryManager.phoneNumber && (
                              <p className="text-xs text-gray-600">{contingentManagerInfo.primaryManager.phoneNumber}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {contingentManagerInfo.otherManagers && contingentManagerInfo.otherManagers.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-amber-700">Other Contacts:</h5>
                          <div className="pl-2 border-l-2 border-amber-300 ml-1 mt-1 space-y-2">
                            {contingentManagerInfo.otherManagers.map((manager) => (
                              <div key={manager.id} className="text-sm">
                                <p className="font-medium">{manager.name}</p>
                                <p className="text-xs text-gray-600">{manager.email}</p>
                                {manager.phoneNumber && (
                                  <p className="text-xs text-gray-600">{manager.phoneNumber}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button onClick={handleJoinContingent} disabled={isLoading} className="w-full mt-2">
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
        </DialogContent>
      </Dialog>
    </Card>
  );
}
