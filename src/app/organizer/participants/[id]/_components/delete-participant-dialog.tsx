"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";

interface DeleteParticipantDialogProps {
  participantId: number;
  participantName: string;
}

interface DependencyInfo {
  contingents: number;
  managedContingents: number;
  teamManagers: number;
  createdManagers: number;
  contingentRequests: number;
  submissions: number;
}

export default function DeleteParticipantDialog({
  participantId,
  participantName,
}: DeleteParticipantDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dependencies, setDependencies] = useState<DependencyInfo | null>(null);
  const [deletionStrategy, setDeletionStrategy] = useState<"soft" | "full">("soft");
  const [deleteContingents, setDeleteContingents] = useState(false);
  const [fetchedDependencies, setFetchedDependencies] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Function to fetch dependency information
  const fetchDependencies = async () => {
    if (fetchedDependencies) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizer/participants/${participantId}/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkOnly: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dependency information");
      }

      const data = await response.json();
      setDependencies(data.dependencies);
      setFetchedDependencies(true);
    } catch (error) {
      console.error("Error fetching dependencies:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dependency information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog open
  const handleOpen = () => {
    setOpen(true);
    fetchDependencies();
  };

  // Handle participant deletion
  const handleDelete = async () => {
    // Clear any previous password errors
    setPasswordError("");
    
    // Validate password for permanent deletion
    if (deletionStrategy === "full" && !adminPassword.trim()) {
      setPasswordError("Admin password is required for permanent deletion");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`/api/organizer/participants/${participantId}/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategy: deletionStrategy,
          deleteContingents: deleteContingents,
          adminPassword: adminPassword.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "Incorrect password") {
          setPasswordError("Incorrect password. Please try again.");
          setIsLoading(false);
          return;
        }
        throw new Error(errorData.error || "Failed to delete participant");
      }

      toast({
        title: "Success",
        description: `Participant ${participantName} has been ${deletionStrategy === "soft" ? "deactivated" : "deleted"}.`,
      });

      // Redirect back to participants list
      router.push("/organizer/participants");
      router.refresh();
    } catch (error) {
      console.error("Error deleting participant:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete participant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={handleOpen} size="sm">
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Participant
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant: {participantName}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please review the information below carefully before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isLoading && !dependencies ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading dependencies...</span>
            </div>
          ) : (
            <>
              {dependencies && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Related Data:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between border p-2 rounded">
                      <span>Contingents:</span>
                      <Badge variant={dependencies.contingents > 0 ? "destructive" : "outline"}>
                        {dependencies.contingents}
                      </Badge>
                    </div>
                    <div className="flex justify-between border p-2 rounded">
                      <span>Managed Contingents:</span>
                      <Badge variant={dependencies.managedContingents > 0 ? "destructive" : "outline"}>
                        {dependencies.managedContingents}
                      </Badge>
                    </div>
                    <div className="flex justify-between border p-2 rounded">
                      <span>Team Managers:</span>
                      <Badge variant={dependencies.teamManagers > 0 ? "destructive" : "outline"}>
                        {dependencies.teamManagers}
                      </Badge>
                    </div>
                    <div className="flex justify-between border p-2 rounded">
                      <span>Created Managers:</span>
                      <Badge variant={dependencies.createdManagers > 0 ? "destructive" : "outline"}>
                        {dependencies.createdManagers}
                      </Badge>
                    </div>
                    <div className="flex justify-between border p-2 rounded">
                      <span>Contingent Requests:</span>
                      <Badge variant={dependencies.contingentRequests > 0 ? "destructive" : "outline"}>
                        {dependencies.contingentRequests}
                      </Badge>
                    </div>
                    <div className="flex justify-between border p-2 rounded">
                      <span>Submissions:</span>
                      <Badge variant={dependencies.submissions > 0 ? "destructive" : "outline"}>
                        {dependencies.submissions}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 my-4">
                <h3 className="text-sm font-medium">Deletion Strategy:</h3>
                <RadioGroup 
                  value={deletionStrategy} 
                  onValueChange={(value) => setDeletionStrategy(value as "soft" | "full")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="soft" id="soft" />
                    <Label htmlFor="soft" className="font-normal">
                      Soft Delete (Recommended)
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground ml-6 -mt-1">
                    Deactivates the account and anonymizes personal data but preserves relationships.
                  </div>

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="font-normal">
                      Permanent Delete
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground ml-6 -mt-1">
                    Completely removes the participant and all directly related data. This may affect contingents and teams.
                  </div>
                </RadioGroup>

                {deletionStrategy === "full" && (
                  <>
                    {dependencies && dependencies.contingents > 0 && (
                      <div className="mt-4 border p-3 rounded-md bg-amber-50">
                        <div className="flex items-start space-x-2">
                          <Checkbox 
                            id="deleteContingents" 
                            checked={deleteContingents}
                            onCheckedChange={(checked) => setDeleteContingents(checked as boolean)}
                          />
                          <div>
                            <Label htmlFor="deleteContingents" className="font-medium">
                              Also delete {dependencies.contingents} contingent(s)
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              If not checked, contingents will remain but will be disconnected from this participant.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 border p-3 rounded-md bg-red-50">
                      <Label htmlFor="adminPassword" className="text-sm font-medium block mb-2">
                        Enter your admin password to confirm permanent deletion
                      </Label>
                      <Input
                        id="adminPassword"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Admin password"
                        className={`${passwordError ? 'border-red-500' : ''}`}
                      />
                      {passwordError && (
                        <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        For security reasons, permanent deletion requires password verification.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Delete {deletionStrategy === "soft" ? "(Soft)" : "(Permanent)"}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
