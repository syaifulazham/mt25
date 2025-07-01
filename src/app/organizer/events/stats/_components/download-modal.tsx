"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { DownloadStatsDocxButton } from './download-stats-docx-button';
import { DownloadContingentSummaryButton } from './download-contingent-summary-button';
import { DownloadParticipantListButton } from './download-participant-list-button';

interface DownloadModalProps {
  zoneId: number;
  zoneName: string;
  hasContingentData: boolean;
}

export function DownloadModal({ zoneId, zoneName, hasContingentData }: DownloadModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Reports</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Zone Statistics Report</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Download complete zone statistics report with all details
            </p>
            <DownloadStatsDocxButton zoneId={zoneId} zoneName={zoneName} />
          </div>
          
          {hasContingentData && (
            <div className="flex flex-col gap-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Contingent Summary Report</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Download contingent summary report grouped by state
              </p>
              <DownloadContingentSummaryButton zoneId={zoneId} zoneName={zoneName} />
            </div>
          )}
          
          <div className="flex flex-col gap-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Participant List</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Download complete list of participants with personal details grouped by state and contingent
            </p>
            <DownloadParticipantListButton zoneId={zoneId} zoneName={zoneName} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
