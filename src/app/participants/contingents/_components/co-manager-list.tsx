"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, UserX, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import contingentApi from "./contingent-api";

interface Manager {
  id: number;
  participant: {
    id: number;
    name: string;
    email: string;
  };
  isOwner: boolean;
}

interface CoManagerListProps {
  contingentId: number;
  isPrimaryManager: boolean;
  onManagersUpdated?: () => void;
}

export function CoManagerList({ contingentId, isPrimaryManager, onManagersUpdated }: CoManagerListProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [verificationInput, setVerificationInput] = useState("");

  // Load managers when the component mounts
  useEffect(() => {
    if (contingentId) {
      loadManagers();
    }
  }, [contingentId]);

  // Load managers from the API
  const loadManagers = async () => {
    try {
      setIsLoading(true);
      const result = await contingentApi.getContingentManagers(contingentId);
      if (result && result.managers) {
        setManagers(result.managers);
      } else {
        console.error('Invalid API response format - missing managers array');
        setManagers([]);
      }
    } catch (error) {
      console.error("Error loading managers:", error);
      toast.error("Failed to load managers");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a random verification code of 4 uppercase letters
  const generateVerificationCode = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  };

  // Handle opening the remove manager dialog
  const handleOpenRemoveDialog = (manager: Manager) => {
    setSelectedManager(manager);
    const code = generateVerificationCode();
    setExpectedCode(code);
    setVerificationCode(code);
    setVerificationInput("");
    setRemoveDialogOpen(true);
  };

  // Handle removing a manager
  const handleRemoveManager = async () => {
    if (!selectedManager) return;

    // Verify that the input matches the expected code
    if (verificationInput !== expectedCode) {
      toast.error("Verification code does not match. Please try again.");
      return;
    }

    try {
      setIsLoading(true);
      await contingentApi.removeManager(
        contingentId, 
        selectedManager.id, 
        verificationInput, 
        expectedCode
      );

      toast.success("Manager removed successfully");
      setRemoveDialogOpen(false);

      // Reload managers to reflect the changes
      await loadManagers();

      // Notify parent component if needed
      if (onManagersUpdated) {
        onManagersUpdated();
      }
    } catch (error: any) {
      console.error("Error removing manager:", error);
      toast.error(error.message || "Failed to remove manager");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && managers.length === 0) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contingent Managers {contingentId ? `(ID: ${contingentId})` : ''}</CardTitle>
      </CardHeader>
      <CardContent>
        {managers.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No managers found
          </div>
        ) : (
          <div className="space-y-3">
            {managers.map((manager) => (
              <div key={manager.id} className="p-3 border rounded-md flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{manager.participant.name}</span>
                    {manager.isOwner && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Primary Manager
                      </Badge>
                    )}
                    {!manager.isOwner && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Co-Manager
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{manager.participant.email}</div>
                </div>
                
                {/* Only show remove button for co-managers and only to primary managers */}
                {isPrimaryManager && !manager.isOwner && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleOpenRemoveDialog(manager)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Remove Manager Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Co-Manager</DialogTitle>
              <DialogDescription>
                You are about to remove {selectedManager?.participant.name} as a co-manager.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-amber-800 text-sm">
                  To confirm removal, please enter these 4 letters: <span className="font-bold">{verificationCode}</span>
                </p>
              </div>

              <div>
                <Input
                  placeholder="Enter verification code"
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value.toUpperCase())}
                  className="w-full"
                  maxLength={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRemoveManager}
                disabled={isLoading || verificationInput.length !== 4}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Confirm Removal"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
