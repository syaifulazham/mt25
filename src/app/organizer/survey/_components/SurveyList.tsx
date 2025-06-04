"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Survey, useSurvey } from "../survey-context";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, File, LineChart, Pencil, Trash, EyeOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { SurveyForm } from "./SurveyForm";

interface SurveyCardProps {
  survey: Survey;
  onEdit: (survey: Survey) => void;
  onDelete: (survey: Survey) => void;
  onAssign: (survey: Survey) => void;
  onViewResults: (survey: Survey) => void;
  onStatusToggle: (survey: Survey) => void;
}

function SurveyCard({ survey, onEdit, onDelete, onAssign, onViewResults, onStatusToggle }: SurveyCardProps) {
  const isActive = survey.status === 'active';
  
  return (
    <Card className={isActive ? 'bg-green-50' : ''}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{survey.name}</CardTitle>
                <Badge variant={isActive ? "outline" : "secondary"} className={`ml-1 ${isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}`}>
                  {isActive ? "Active" : "Draft"}
                </Badge>
              </div>
              <CardDescription className="text-sm mt-1 line-clamp-2">
                {survey.description || "No description provided"}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(survey)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Survey
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusToggle(survey)}>
                {isActive ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" /> Set as Draft
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" /> Activate Survey
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewResults(survey)}>
                <LineChart className="mr-2 h-4 w-4" /> View Results
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(survey)} className="text-red-600">
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Questions</p>
              <p className="font-medium">{survey._count?.questions || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Assigned to</p>
              <p className="font-medium">{survey._count?.contestantsComposition || 0} contestants</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDistanceToNow(new Date(survey.createdAt), { addSuffix: true })}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Responses</p>
              <p className="font-medium">{survey._count?.answers || 0}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SurveyListProps {
  filterStatus?: 'active' | 'draft' | 'completed';
  onCreateSurvey: () => void;
  onEditSurvey: (survey: Survey) => void;
  onAssignSurvey: (survey: Survey) => void;
  onViewResults: (survey: Survey) => void;
}

export function SurveyList({ 
  filterStatus,
  onCreateSurvey,
  onEditSurvey,
  onAssignSurvey,
  onViewResults 
}: SurveyListProps) {
  const { surveys: allSurveys, loading, error, refreshSurveys } = useSurvey();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Survey | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const router = useRouter();

  // Filter surveys based on status if provided
  const surveys = filterStatus 
    ? allSurveys.filter(survey => {
        switch (filterStatus) {
          case 'active':
            return survey.status === 'active'; 
          case 'draft':
            return survey.status === 'draft';
          case 'completed':
            return survey._count?.answers && survey._count.answers > 0;
          default:
            return true;
        }
      })
    : allSurveys;

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const response = await fetch(`/api/survey/${confirmDelete.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete survey");
      }
      
      await refreshSurveys();
      setConfirmDelete(null);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Error deleting survey:", error);
    }
  };
  
  const handleToggleStatus = async (survey: Survey) => {
    setIsTogglingStatus(true);
    try {
      const response = await fetch(`/api/survey-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: survey.id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update survey status");
      }
      
      const data = await response.json();
      toast({
        title: "Survey status updated",
        description: `Survey is now ${data.status === 'active' ? 'active' : 'in draft mode'}`,
        variant: "default",
      });
      
      await refreshSurveys();
    } catch (error) {
      console.error("Error toggling survey status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update survey status",
        variant: "destructive",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleEdit = (survey: Survey) => {
    onEditSurvey(survey);
  };

  const handleAssign = (survey: Survey) => {
    onAssignSurvey(survey);
  };

  const handleViewResults = (survey: Survey) => {
    onViewResults(survey);
  };

  const handleConfirmDelete = (survey: Survey) => {
    setConfirmDelete(survey);
    setDeleteConfirmOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-md">
        <p>Error loading surveys: {error}</p>
        <Button 
          onClick={() => refreshSurveys()}
          variant="outline"
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Surveys</h2>
          <p className="text-muted-foreground">Manage your surveys</p>
        </div>
        <Button onClick={onCreateSurvey}>Create New Survey</Button>
      </div>

      {surveys.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <File className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No surveys found</h3>
          <p className="text-muted-foreground mt-1 mb-4">Create your first survey to get started</p>
          <Button onClick={onCreateSurvey}>Create Survey</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onEdit={onEditSurvey}
              onDelete={(survey) => setConfirmDelete(survey)}
              onAssign={onAssignSurvey}
              onViewResults={onViewResults}
              onStatusToggle={handleToggleStatus}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the survey and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
