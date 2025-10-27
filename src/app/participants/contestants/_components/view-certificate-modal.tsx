'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileText, Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ViewCertificateModalProps {
  contestantId: number;
  contestantName: string;
}

export default function ViewCertificateModal({ contestantId, contestantName }: ViewCertificateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch certificate when modal opens
  useEffect(() => {
    if (isOpen && !certificate) {
      fetchCertificate();
    }
  }, [isOpen]);

  const fetchCertificate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/participants/contestants/${contestantId}/certificate`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('No certificate found for this contestant');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load certificate');
        }
        return;
      }

      const data = await response.json();
      setCertificate(data);
    } catch (error: any) {
      console.error('Error fetching certificate:', error);
      setError(error.message || 'Failed to load certificate');
      toast.error('Failed to load certificate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!certificate?.id) return;

    const link = document.createElement('a');
    link.href = `/api/certificates/${certificate.id}/download`;
    link.click();
    toast.success('Certificate download started');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-50" 
          title="View Certificate"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Certificate - {contestantName}</DialogTitle>
          <DialogDescription>
            View and download the generated certificate
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Loading certificate...</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-sm text-gray-700 font-medium mb-2">Certificate Not Found</p>
                <p className="text-xs text-gray-500">{error}</p>
              </div>
            </div>
          )}

          {certificate && !isLoading && !error && (
            <>
              <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
                <iframe
                  src={`/api/certificates/${certificate.id}/view`}
                  className="w-full h-full"
                  title="Certificate Preview"
                />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="text-sm text-gray-600">
                  <p><span className="font-medium">Serial Number:</span> {certificate.serialNumber || 'N/A'}</p>
                  <p><span className="font-medium">Status:</span> <span className="text-green-600">{certificate.status}</span></p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
