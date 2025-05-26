"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileUploadDropzone } from "@/components/ui/file-upload-dropzone";
import { CheckCircle, Loader2 } from "lucide-react";
import { Contingent } from "./contingent-api";
import { useLanguage } from "@/lib/i18n/language-context";

interface ContingentDetailsFormProps {
  selectedContingent: Contingent;
  name: string;
  setName: (value: string) => void;
  shortName: string;
  setShortName: (value: string) => void;
  handleLogoUpload: (file: File) => void;
  isLoading: boolean;
  handleUpdateContingent: () => void;
  updateSuccess: boolean;
}

export function ContingentDetailsForm({
  selectedContingent,
  name,
  setName,
  shortName,
  setShortName,
  handleLogoUpload,
  isLoading,
  handleUpdateContingent,
  updateSuccess
}: ContingentDetailsFormProps) {
  // Make sure the logo URL has the proper format for Next.js to locate it
  const logoUrl = selectedContingent.logoUrl 
    ? (selectedContingent.logoUrl.startsWith('http') 
      ? selectedContingent.logoUrl 
      : selectedContingent.logoUrl.startsWith('/') 
        ? selectedContingent.logoUrl 
        : `/${selectedContingent.logoUrl}`)
    : '/images/__logo__.png';
  const { t } = useLanguage();
  
  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">{t('contingent.details')}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name" className="mb-2 block">{t('contingent.update_name')}</Label>
          <Input 
            id="name"
            placeholder={t('contingent.enter_name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('contingent.update_name_desc')}
          </p>
        </div>
        <div>
          <Label htmlFor="short-name" className="mb-2 block">{t('contingent.short_name')}</Label>
          <Input 
            id="short-name"
            placeholder={t('contingent.enter_short_name')}
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('contingent.short_name_desc')}
          </p>
        </div>
        
        <div>
          <Label className="mb-2 block">{t('contingent.logo')}</Label>
          <div className="h-[150px] w-[150px] mx-auto">
            <FileUploadDropzone
              onFileSelect={handleLogoUpload}
              accept="image/*"
              maxSize={2}
              previewUrl={logoUrl}
              className="h-full"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {t('contingent.upload_logo')}
          </p>
        </div>
      </div>
      
      <Separator className="my-4" />
      <div className="flex justify-end space-x-2">
        <Button 
          onClick={handleUpdateContingent} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('contingent.updating')}
            </>
          ) : (
            t('contingent.update')
          )}
        </Button>
        {updateSuccess && (
          <span className="inline-flex items-center text-green-600 text-sm">
            <CheckCircle className="mr-1 h-4 w-4" /> {t('contingent.updated')}
          </span>
        )}
      </div>
      

    </div>
  );
}
