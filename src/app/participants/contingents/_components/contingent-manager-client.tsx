"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { FileUploadDropzone } from "@/components/ui/file-upload-dropzone";
import { toast } from "sonner";
import { School as SchoolIcon, Building, Users, CheckCircle, XCircle, Clock, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/language-context";
import contingentApi, { School, HigherInstitution, Contingent, ContingentRequest } from "./contingent-api";
// Import components directly - TypeScript might need a rebuild to recognize the module files
import { ContingentDetailsForm } from "./contingent-details-form";
import { ContingentCreationForm } from "./contingent-creation-form";

interface ContingentManagerClientProps {
  userId: number;
}

export default function ContingentManagerClient({ userId }: ContingentManagerClientProps) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userContingents, setUserContingents] = useState<Contingent[]>([]);
  const [contingentRequests, setContingentRequests] = useState<ContingentRequest[]>([]);
  const [selectedContingent, setSelectedContingent] = useState<Contingent | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Load user's contingents on component mount
  useEffect(() => {
    loadUserContingents();
  }, [userId]);

  const loadUserContingents = async () => {
    try {
      setIsLoading(true);
      const contingents = await contingentApi.getUserContingents(userId);
      setUserContingents(contingents);
      
      // If user has contingents, select the first one as active
      if (contingents.length > 0) {
        // Select the first contingent where user is manager
        const managerContingent = contingents.find((c: Contingent) => c.isManager);
        if (managerContingent) {
          setSelectedContingent(managerContingent);
          setName(managerContingent.name || "");
          setShortName(managerContingent.short_name || "");
          // Load contingent requests if user is a manager
          loadContingentRequests(managerContingent.id);
        } else {
          setSelectedContingent(contingents[0]);
          setName(contingents[0].name || "");
          setShortName(contingents[0].short_name || "");
        }
      }
    } catch (error) {
      console.error("Error loading contingents:", error);
      toast.error("Failed to load your contingents");
    } finally {
      setIsLoading(false);
    }
  };

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
          await loadUserContingents();
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

  // Handle contingent details update
  const handleUpdateContingent = async () => {
    if (!selectedContingent) return;
    
    try {
      setIsLoading(true);
      setUpdateSuccess(false);
      
      await contingentApi.updateContingentDetails(selectedContingent.id, {
        name: name,
        short_name: shortName,
        logoFile: logoFile || undefined,
      });
      
      toast.success("Contingent details updated successfully");
      setUpdateSuccess(true);
      
      // Reload contingents to get updated data
      await loadUserContingents();
    } catch (error) {
      console.error("Error updating contingent:", error);
      toast.error("Failed to update contingent details");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle leaving a contingent
  const handleLeaveContingent = async () => {
    if (!selectedContingent || !userId) return;
    
    try {
      setIsLoading(true);
      
      await contingentApi.leaveContingent(selectedContingent.id, userId);
      
      toast.success("You have left the contingent successfully");
      setLeaveDialogOpen(false);
      
      // Reload contingents to get updated data
      await loadUserContingents();
    } catch (error: any) {
      console.error("Error leaving contingent:", error);
      toast.error(error.message || "Failed to leave contingent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = (file: File) => {
    setLogoFile(file);
  };

  // Render different views based on whether the user has a contingent or not
  const renderContent = () => {
    if (isLoading && userContingents.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>{t('common.loading')}</p>
          </CardContent>
        </Card>
      );
    }

    // If user has no contingent, show creation form
    if (userContingents.length === 0) {
      return <ContingentCreationForm userId={userId} onContingentCreated={loadUserContingents} />;
    }

    // If user has contingent(s), show management interface
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Contingent selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('contingent.title')}</CardTitle>
              <CardDescription>
                {userContingents.length > 1 
                  ? "Select a contingent to manage"
                  : "Your contingent details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userContingents.map((contingent) => (
                  <div 
                    key={contingent.id}
                    className={`p-3 border rounded-md cursor-pointer hover:border-primary transition-colors
                      ${selectedContingent?.id === contingent.id ? 'border-primary bg-accent/50' : ''}`}
                    onClick={() => {
                      setSelectedContingent(contingent);
                      setName(contingent.name || "");
                      setShortName(contingent.short_name || "");
                      if (contingent.isManager) {
                        loadContingentRequests(contingent.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium truncate max-w-[70%]">
                        {contingent.name}
                      </div>
                      {contingent.isManager && (
                        <Badge variant="outline">
                          {contingent.isOwner ? 'Primary Manager' : 'Co-Manager'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                      <span>{contingent.school?.name || contingent.higherInstitution?.name}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Users className="h-3 w-3 mr-1" /> {contingent.memberCount} members
                    </div>
                    {contingent.status === 'PENDING' && (
                      <Badge variant="secondary" className="mt-2">Pending Approval</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Contingent details and management */}
        <div className="lg:col-span-2">
          {selectedContingent ? (
            <div className="space-y-6">
              {/* Contingent details card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{selectedContingent.name}</span>
                    {selectedContingent.status === 'PENDING' && (
                      <Badge variant="secondary">Pending Approval</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-1 text-sm">
                      {selectedContingent.school ? (
                        <SchoolIcon className="h-3 w-3" />
                      ) : (
                        <Building className="h-3 w-3" />
                      )}
                      <span>
                        {selectedContingent.school?.name || selectedContingent.higherInstitution?.name}
                      </span>
                    </div>
                    <div className="mt-1">
                      {selectedContingent.description || 'No description provided'}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* For active contingents only */}
                  {selectedContingent.status === 'ACTIVE' && (
                    <>
                      <ContingentDetailsForm 
                        selectedContingent={selectedContingent}
                        name={name}
                        setName={setName}
                        shortName={shortName}
                        setShortName={setShortName}
                        handleLogoUpload={handleLogoUpload}
                        isLoading={isLoading}
                        handleUpdateContingent={handleUpdateContingent}
                        updateSuccess={updateSuccess}
                      />
                      
                      {/* Action buttons */}
                      <div className="flex flex-col gap-4 pt-4">
                        
                        {/* Leave Contingent button - always visible for members */}
                        {!selectedContingent.isOwner && (
                          <div>
                            <Button 
                              variant="outline"
                              onClick={() => setLeaveDialogOpen(true)}
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              {t('contingent.leave')}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {t('contingent.leave_desc')}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pending Requests section - for managers only */}
              {selectedContingent.isManager && selectedContingent.status === 'ACTIVE' && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('contingent.pending_requests')}</CardTitle>
                    <CardDescription>
                      {t('contingent.pending_requests_desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contingentRequests.length === 0 ? (
                      <div className="p-4 border rounded-md bg-muted/50 text-center">
                        <p>{t('contingent.no_pending_requests')}</p>
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
                                  {t('contingent.requested_on')} {new Date(request.createdAt).toLocaleDateString()}
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
                                <XCircle className="h-4 w-4 mr-1" /> {t('contingent.reject')}
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8"
                                onClick={() => handleUpdateRequest(request.id, 'APPROVED')}
                                disabled={isLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" /> {t('contingent.approve')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
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
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}
      
      {/* Leave Contingent Confirmation Dialog */}
      {selectedContingent && (
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Leave Contingent</DialogTitle>
              <DialogDescription>
                Are you sure you want to leave the contingent "{selectedContingent.name}"?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-amber-600 text-sm">
                {t('contingent.leave_note')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleLeaveContingent}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('contingent.leaving')}
                  </>
                ) : (
                  t('contingent.leave')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
