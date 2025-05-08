"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
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
  const { t } = useLanguage(); // Initialize language context
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
        throw new Error(data.error || t('contestant.contest.error_assign'));
      }
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: t('contestant.contest.success_title'),
          description: `${t('contestant.contest.success_description')} ${data.assignmentsCreated}`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error(t('contestant.contest.error_assigning'), error);
      toast({
        title: t('contestant.contest.error_title'),
        description: (error as Error).message || t('contestant.contest.error_assign'),
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
        {t('contestant.contest.bulk_assign')}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('contestant.contest.bulk_assign')}</DialogTitle>
            <DialogDescription>
              {t('contestant.contest.bulk_assign_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              {t('contestant.contest.action_will')}:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>{t('contestant.contest.action_find')}</li>
              <li>{t('contestant.contest.action_match')}</li>
              <li>{t('contestant.contest.action_create')}</li>
              <li>{t('contestant.contest.action_skip')}</li>
            </ul>
            
            {result && (
              <div className="mt-4 p-3 rounded-md bg-muted">
                <p className="font-medium">{t('contestant.contest.results')}:</p>
                <p className="text-sm">
                  {result.assignmentsCreated} {t('contestant.contest.assignments_created')}
                </p>
                {result.errors && result.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {result.errors.length} {t('contestant.contest.errors_occurred')}
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('contestant.contest.assigning')}
                </>
              ) : (
                t('contestant.contest.assign')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
