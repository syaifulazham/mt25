"use client";

import { useState } from "react";
import { Survey, useSurvey } from "../survey-context";
import { SurveyList } from "./SurveyList";
import { SurveyForm } from "./SurveyForm";
import { ContestantAssignment } from "./ContestantAssignment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import the new SurveyResultsView component
import { SurveyResultsView } from './SurveyResultsView';

interface SurveyResultsProps {
  survey: Survey;
  onBack: () => void;
}

function SurveyResults({ survey, onBack }: SurveyResultsProps) {
  return (
    <SurveyResultsView survey={survey} onBack={onBack} />
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
