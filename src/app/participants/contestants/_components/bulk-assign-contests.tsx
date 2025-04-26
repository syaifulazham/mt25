"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Award, Loader2 } from "lucide-react";

export default function BulkAssignContests() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    assignmentsCreated?: number;
    errors?: any[];
  } | null>(null);

  const handleBulkAssign = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      const response = await fetch("/api/participants/contests/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign contests");
      }
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Success!",
          description: `Created ${data.assignmentsCreated} contest assignments.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error assigning contests:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to assign contests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
        onClick={() => setIsOpen(true)}
      >
        <Award className="mr-2 h-4 w-4" />
        Bulk Assign Contests
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign Contests</DialogTitle>
            <DialogDescription>
              This will automatically assign all eligible contestants to contests based on their age criteria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              This action will:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Find all contestants in your managed contingents</li>
              <li>Match each contestant with eligible contests based on age</li>
              <li>Create contest participation records for each eligible match</li>
              <li>Skip contestants already assigned to contests</li>
            </ul>
            
            {result && (
              <div className="mt-4 p-3 rounded-md bg-muted">
                <p className="font-medium">Results:</p>
                <p className="text-sm">
                  {result.assignmentsCreated} new contest assignments created
                </p>
                {result.errors && result.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {result.errors.length} errors occurred
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Contests"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
