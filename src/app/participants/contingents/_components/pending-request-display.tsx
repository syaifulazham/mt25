"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";

interface PendingRequestDisplayProps {
  pendingRequest: any;
  onCancelSuccess: () => void;
}

export function PendingRequestDisplay({ pendingRequest, onCancelSuccess }: PendingRequestDisplayProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  
  if (!pendingRequest) return null;
  
  // Extract contingent and institution details
  const { contingent } = pendingRequest;
  const institutionName = contingent?.school?.name || 
                        contingent?.higherInstitution?.name || 
                        contingent?.independent?.name || 
                        t("contingent.unknown_institution");
  
  // Extract primary manager if available
  const primaryManager = contingent?.managers?.find((m: any) => m.is_primary)?.participant || 
                        contingent?.managers?.[0]?.participant;
  
  const handleCancelRequest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/participants/contingent-requests/${pendingRequest.id}/cancel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel request');
      }
      
      toast.success(t("contingent.request_cancelled"));
      onCancelSuccess();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error(t("contingent.cancel_request_error"));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle>{t("contingent.pending_request")}</CardTitle>
        <CardDescription>
          {t("contingent.pending_request_desc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">{t("contingent.request_pending")}</h3>
          <p className="text-yellow-700">
            {t("contingent.request_pending_message").replace('{date}', new Date(pendingRequest.createdAt).toLocaleDateString())}
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-md font-medium">{t("contingent.institution_details")}</h3>
            <p className="text-gray-700">{institutionName}</p>
          </div>
          
          {primaryManager && (
            <div>
              <h3 className="text-md font-medium">{t("contingent.primary_manager")}</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium">{primaryManager.name}</p>
                <p className="text-sm text-gray-600">{primaryManager.email}</p>
                {primaryManager.phoneNumber && (
                  <p className="text-sm text-gray-600">{primaryManager.phoneNumber}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="pt-4">
            <Button 
              variant="outline" 
              className="mr-2"
              onClick={() => router.push("/participants/contingents")}
            >
              {t("common.back")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelRequest}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.processing")}
                </>
              ) : (
                t("contingent.cancel_request")
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


