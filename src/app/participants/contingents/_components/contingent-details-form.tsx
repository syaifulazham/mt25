"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileUploadDropzone } from "@/components/ui/file-upload-dropzone";
import { CheckCircle, Loader2 } from "lucide-react";
import { Contingent } from "./contingent-api";

interface ContingentDetailsFormProps {
  selectedContingent: Contingent;
  shortName: string;
  setShortName: (value: string) => void;
  handleLogoUpload: (file: File) => void;
  isLoading: boolean;
  handleUpdateContingent: () => void;
  updateSuccess: boolean;
}

export function ContingentDetailsForm({
  selectedContingent,
  shortName,
  setShortName,
  handleLogoUpload,
  isLoading,
  handleUpdateContingent,
  updateSuccess
}: ContingentDetailsFormProps) {
  const logoUrl = selectedContingent.logoUrl || '/images/__logo__.png';
  
  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">Contingent Details</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="short-name" className="mb-2 block">Short Name</Label>
          <Input 
            id="short-name"
            placeholder="Enter a short name or acronym"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            This will be used in places where space is limited
          </p>
        </div>
        
        <div>
          <Label className="mb-2 block">Contingent Logo</Label>
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
            Upload a logo image (max 2MB)
          </p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleUpdateContingent} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : updateSuccess ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Updated
            </>
          ) : (
            'Update Details'
          )}
        </Button>
      </div>
      

    </div>
  );
}
