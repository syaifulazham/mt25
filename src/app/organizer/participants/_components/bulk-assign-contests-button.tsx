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

interface BulkAssignContestsButtonProps {
  contingentId: number;
  contingentName: string;
  contestantCount: number;
}

export default function BulkAssignContestsButton({ 
  contingentId, 
  contingentName, 
  contestantCount 
}: BulkAssignContestsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    contingentName?: string;
    assignmentsCreated?: number;
    errors?: any[];
  } | null>(null);
  const [progress, setProgress] = useState<string>("");

  const handleBulkAssign = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      setProgress(`Starting assignment for ${contestantCount} contestants...`);
      
      // Update progress message after a brief delay to show we're working
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.endsWith('...')) return `Processing contestants, please wait`;
          if (prev.endsWith('.')) return `${prev}.`;
          return `${prev}.`;
        });
      }, 800);
      
      const response = await fetch("/api/organizer/contests/assign-by-contingent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contingentId }),
      });
      
      clearInterval(progressInterval);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign contests");
      }
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Success!",
          description: `Successfully created ${data.assignmentsCreated} contest assignments for ${contingentName}`,
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
      setProgress("");
    }
  };

  return (
    <>
      <Button 
        variant="outline"
        size="icon"
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-9 w-9"
        onClick={() => setIsOpen(true)}
      >
        <Award className="h-4 w-4" />
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign Contests</DialogTitle>
            <DialogDescription>
              This will automatically assign all eligible contests to {contestantCount} contestants in the {contingentName} contingent based on their age criteria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              This action will:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Find all contestants in the {contingentName} contingent</li>
              <li>Match each contestant with eligible contests based on age</li>
              <li>Create contest participation records for each eligible contestant-contest pair</li>
              <li>Skip contestants who are already registered for contests</li>
            </ul>
            
            {progress && (
              <div className="mt-4 p-3 rounded-md bg-blue-50">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                  <p className="text-sm text-blue-700">{progress}</p>
                </div>
              </div>
            )}
            
            {result && (
              <div className="mt-4 p-3 rounded-md bg-muted">
                <p className="font-medium">Results:</p>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                      <Award className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {result.assignmentsCreated} contest assignments created
                      </p>
                      <p className="text-xs text-muted-foreground">
                        For contingent: {result.contingentName || contingentName}
                      </p>
                    </div>
                  </div>
                  
                  {result.errors && result.errors.length > 0 && (
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-2">
                        <span className="text-amber-600 font-bold">{result.errors.length}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-700">
                          {result.errors.length} errors occurred during assignment
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Some contestants may need manual assignment
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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
