"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface ProfileCompletionAlertProps {
  userDetails: {
    phoneNumber?: string | null;
    ic?: string | null;
    gender?: string | null;
  };
}

export default function ProfileCompletionAlert({ userDetails }: ProfileCompletionAlertProps) {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  // If the user has already dismissed the alert or already has all required fields, don't show it
  if (dismissed || 
      (userDetails?.phoneNumber && userDetails?.ic && userDetails?.gender)) {
    return null;
  }

  // Track which fields are missing
  const missingFields: string[] = [];
  
  if (!userDetails?.phoneNumber) {
    missingFields.push(t('profile.phone_number') || "phone number");
  }
  
  if (!userDetails?.ic) {
    missingFields.push(t('profile.ic') || "IC number");
  }
  
  if (!userDetails?.gender) {
    missingFields.push(t('profile.gender') || "gender");
  }

  // If no fields are missing, don't show the alert
  if (missingFields.length === 0) {
    return null;
  }

  const missingFieldsText = missingFields.join(", ");

  return (
    // Full width container that breaks out of parent constraints
    <div className="mb-6 -mx-6 sm:-mx-10 md:-mx-12 lg:-mx-16">
      {/* Full width background with no padding to ensure color extends edge to edge */}
      <div className="w-full bg-amber-50 border-y border-amber-200">
        <div className="max-w-[95%] w-full mx-auto py-5 px-4 sm:px-6 md:px-8">
          {/* Main alert content with proper structure */}
          <div className="flex items-start justify-between gap-4">
            {/* Icon and text content */}
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 mt-0.5 mr-4 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-amber-800 text-lg font-semibold mb-2">
                  {t('dashboard.profile_incomplete') || "Complete Your Profile"}
                </h3>
                <p className="text-amber-700 mb-4">
                  {/* Replace {{fields}} placeholder in translation with actual missing fields */}
                  {(t('dashboard.profile_required_fields') || 
                    "Please complete your profile by adding the following required information: {{fields}}. Completing your profile is essential for contest participation.").replace('{{fields}}', missingFieldsText)}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-200 hover:text-amber-900" 
                  asChild
                >
                  <Link href="/participants/profile/edit">
                    {t('dashboard.complete_profile') || "Complete Profile"}
                  </Link>
                </Button>
              </div>
            </div>
            {/* Close button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-amber-700 hover:text-amber-900 hover:bg-amber-100 flex-shrink-0"
              onClick={() => setDismissed(true)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">{t('close') || "Close"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
