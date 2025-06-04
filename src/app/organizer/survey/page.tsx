import { Metadata } from "next";
import { SurveyProvider } from "./survey-context";
import { SurveyDashboard } from "@/app/organizer/survey/_components/SurveyDashboard";

// Explicitly export specific types to ensure proper TypeScript compilation

export const metadata: Metadata = {
  title: "Survey Management | Techlympics 2025",
  description: "Manage surveys and questionnaires for Techlympics 2025 participants",
};

export default function SurveyPage() {
  return (
    <SurveyProvider>
      <SurveyDashboard />
    </SurveyProvider>
  );
}
