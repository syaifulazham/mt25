"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface SurveyQuestion {
  id: number;
  surveyId: number;
  question: string;
  questionType: 'text' | 'single_choice' | 'multiple_choice';
  options: string[] | null;
  displayOrder: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Survey {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  questions: SurveyQuestion[];
  _count?: {
    questions: number;
    contestantsComposition: number;
    answers: number;
  };
}

interface SurveyContextType {
  surveys: Survey[];
  loading: boolean;
  error: string | null;
  selectedSurvey: Survey | null;
  setSelectedSurvey: (survey: Survey | null) => void;
  refreshSurveys: () => Promise<void>;
  selectSurvey: (survey: Survey | null) => void;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

export function useSurvey() {
  const context = useContext(SurveyContext);
  if (!context) {
    throw new Error("useSurvey must be used within a SurveyProvider");
  }
  return context;
}

interface SurveyProviderProps {
  children: ReactNode;
}

export function SurveyProvider({ children }: SurveyProviderProps) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  async function fetchSurveys() {
    try {
      setLoading(true);
      const response = await fetch('/api/survey');
      
      if (!response.ok) {
        throw new Error('Failed to fetch surveys');
      }
      
      const data = await response.json();
      setSurveys(data);
    } catch (err) {
      console.error('Error fetching surveys:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSurveys();
  }, []);

  const refreshSurveys = async () => {
    await fetchSurveys();
  };

  const selectSurvey = (survey: Survey | null) => {
    setSelectedSurvey(survey);
  };

  const value = {
    surveys,
    loading,
    error,
    selectedSurvey,
    setSelectedSurvey,
    refreshSurveys,
    selectSurvey
  };

  return (
    <SurveyContext.Provider value={value}>
      {children}
    </SurveyContext.Provider>
  );
}
