"use client";

import { useState } from "react";
import { Survey, useSurvey } from "../survey-context";
import { SurveyList } from "./SurveyList";
import { SurveyForm } from "./SurveyForm";
import { ContestantAssignment } from "./ContestantAssignment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SurveyResultsProps {
  survey: Survey;
  onBack: () => void;
}

function SurveyResults({ survey, onBack }: SurveyResultsProps) {
  // Basic placeholder for survey results view
  return (
    <div className="flex flex-col gap-4">
      <button 
        onClick={onBack}
        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
        Back to Surveys
      </button>
      
      <div className="grid gap-4">
        <h2 className="text-2xl font-bold">{survey.name} - Results</h2>
        <p className="text-muted-foreground">
          {survey._count?.answers || 0} responses received out of {survey._count?.contestantsComposition || 0} assigned contestants.
        </p>
        
        <div className="p-8 text-center border rounded-md">
          <p className="text-lg text-muted-foreground">
            Survey results view is coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}

export function SurveyDashboard() {
  const { selectedSurvey, setSelectedSurvey } = useSurvey();
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'assign' | 'results'>('list');
  
  const handleBack = () => {
    setView('list');
    setSelectedSurvey(null);
  };
  
  const handleEditSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setView('edit');
  };
  
  const handleAssignContestants = (survey: Survey) => {
    setSelectedSurvey(survey);
    setView('assign');
  };
  
  const handleViewResults = (survey: Survey) => {
    setSelectedSurvey(survey);
    setView('results');
  };
  
  const renderContent = () => {
    if (view === 'create') {
      return (
        <SurveyForm 
          onCancel={handleBack}
          onSuccess={handleBack}
        />
      );
    }
    
    if (view === 'edit' && selectedSurvey) {
      return (
        <SurveyForm 
          survey={selectedSurvey}
          onCancel={handleBack}
          onSuccess={handleBack}
        />
      );
    }
    
    if (view === 'assign' && selectedSurvey) {
      return (
        <ContestantAssignment
          survey={selectedSurvey}
          onBack={handleBack}
          onSuccess={handleBack}
        />
      );
    }
    
    if (view === 'results' && selectedSurvey) {
      return (
        <SurveyResults
          survey={selectedSurvey}
          onBack={handleBack}
        />
      );
    }
    
    // Default view - list all surveys with filtering tabs
    return (
      <div className="flex flex-col gap-8 p-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Surveys</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <SurveyList 
              onCreateSurvey={() => setView('create')}
              onEditSurvey={handleEditSurvey}
              onAssignSurvey={handleAssignContestants}
              onViewResults={handleViewResults}
            />
          </TabsContent>
          
          <TabsContent value="active" className="mt-6">
            <SurveyList 
              filterStatus="active"
              onCreateSurvey={() => setView('create')}
              onEditSurvey={handleEditSurvey}
              onAssignSurvey={handleAssignContestants}
              onViewResults={handleViewResults}
            />
          </TabsContent>
          
          <TabsContent value="draft" className="mt-6">
            <SurveyList 
              filterStatus="draft"
              onCreateSurvey={() => setView('create')}
              onEditSurvey={handleEditSurvey}
              onAssignSurvey={handleAssignContestants}
              onViewResults={handleViewResults}
            />
          </TabsContent>
          
          <TabsContent value="completed" className="mt-6">
            <SurveyList 
              filterStatus="completed"
              onCreateSurvey={() => setView('create')}
              onEditSurvey={handleEditSurvey}
              onAssignSurvey={handleAssignContestants}
              onViewResults={handleViewResults}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6">
      {renderContent()}
    </div>
  );
}
