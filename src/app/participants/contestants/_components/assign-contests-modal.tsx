"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { Award, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Contest {
  id: number;
  name: string;
  description?: string;
  minAge?: number;
  maxAge?: number;
  isAssigned?: boolean;
}

interface Contestant {
  id: number;
  name: string;
  age: number;
}

interface AssignContestsModalProps {
  contestantId: number;
  contestantName: string;
  onSuccess?: () => void;
}

export default function AssignContestsModal({ 
  contestantId, 
  contestantName,
  onSuccess 
}: AssignContestsModalProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [eligibleContests, setEligibleContests] = useState<Contest[]>([]);
  const [selectedContests, setSelectedContests] = useState<number[]>([]);

  const fetchEligibleContests = async () => {
    try {
      setIsFetching(true);
      
      const response = await fetch(`/api/participants/contestants/${contestantId}/assign-contests`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('contestant.contests.error_fetch'));
      }
      
      const data = await response.json();
      
      setContestant(data.contestant);
      setEligibleContests(data.eligibleContests || []);
      
      // Pre-select already assigned contests
      setSelectedContests(
        data.eligibleContests
          .filter((contest: Contest) => contest.isAssigned)
          .map((contest: Contest) => contest.id)
      );
    } catch (error) {
      console.error("Error fetching eligible contests:", error);
      toast({
        title: t('contestant.contests.error_title'),
        description: (error as Error).message || t('contestant.contests.error_fetch'),
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchEligibleContests();
    }
  };

  const handleToggleContest = (contestId: number) => {
    setSelectedContests(prev => {
      if (prev.includes(contestId)) {
        return prev.filter(id => id !== contestId);
      } else {
        return [...prev, contestId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/participants/contestants/${contestantId}/assign-contests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contestIds: selectedContests,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || t('contestant.contests.error_assign'));
      }
      
      toast({
        title: t('contestant.contests.success_title'),
        description: `${t('contestant.contests.success_description')} ${contestantName}`,
        variant: "default",
      });
      
      setIsOpen(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error assigning contests:", error);
      toast({
        title: t('contestant.contests.error_title'),
        description: (error as Error).message || t('contestant.contests.error_assign'),
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
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => handleOpenChange(true)}
      >
        <Award className="mr-1 h-3 w-3" />
        {t('contestant.contests.assign_button')}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('contestant.contests.title')} {contestantName}</DialogTitle>
            <DialogDescription>
              {t('contestant.contests.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isFetching ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {contestant && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">{t('contestant.contests.contestant_age')}: {contestant.age}</p>
                  </div>
                )}
                
                {eligibleContests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {t('contestant.contests.no_eligible_contests')}
                  </p>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {eligibleContests.map((contest) => (
                        <div 
                          key={contest.id} 
                          className="flex items-start space-x-3 p-3 rounded-md border"
                        >
                          <Checkbox
                            id={`contest-${contest.id}`}
                            checked={selectedContests.includes(contest.id)}
                            onCheckedChange={() => handleToggleContest(contest.id)}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`contest-${contest.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {contest.name}
                              {contest.isAssigned && (
                                <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-200">
                                  {t('contestant.contests.already_assigned')}
                                </Badge>
                              )}
                            </label>
                            {contest.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {contest.description}
                              </p>
                            )}
                            {(contest.minAge || contest.maxAge) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('contestant.contests.age_range')}: 
                                {contest.minAge ? ` ${contest.minAge}` : t('contestant.contests.any')} 
                                {t('contestant.contests.to')} 
                                {contest.maxAge ? `${contest.maxAge}` : t('contestant.contests.any')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
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
              onClick={handleSave}
              disabled={isLoading || isFetching || eligibleContests.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('contestant.contests.saving')}
                </>
              ) : (
                t('contestant.contests.save_assignments')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
