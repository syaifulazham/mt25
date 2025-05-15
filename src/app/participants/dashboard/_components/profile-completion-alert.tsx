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
    <div className="mb-6 animate-fadeIn rounded-md overflow-hidden border border-amber-300">
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 p-4 shadow-sm">
        <div className="flex gap-3 items-start justify-between">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 dark:text-amber-300">
                {t('dashboard.profile_incomplete') || "Complete Your Profile"}
              </h4>
              <div className="mt-2 text-amber-800 dark:text-amber-200">
                <p className="mb-3">
                  {/* Replace {{fields}} placeholder in translation with actual missing fields */}
                  {(t('dashboard.profile_required_fields') || 
                    "Please complete your profile by adding the following required information: {{fields}}. Completing your profile is essential for contest participation.").replace('{{fields}}', missingFieldsText)}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    size="sm" 
                    className="whitespace-nowrap w-full sm:w-auto bg-amber-600 hover:bg-amber-700 border-amber-700" 
                    asChild
                  >
                    <Link href="/participants/profile/edit">
                      {t('dashboard.complete_profile') || "Complete Profile"}
                    </Link>
                  </Button>
                </div>
              </div>
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
  );
}
