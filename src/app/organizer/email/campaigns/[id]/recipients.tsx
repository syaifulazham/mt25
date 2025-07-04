"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { CheckCircleIcon, ChevronDownIcon, FileUpIcon, LoaderIcon, Trash2Icon, UploadIcon, UsersIcon } from 'lucide-react';

interface EmailRecipient {
  id: number;
  email: string;
  name: string | null;
  source: string;
  status: string;
  outgoing_email: {
    id: number;
    delivery_status: string;
    sent_at: string | null;
  } | null;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface RecipientsListProps {
  campaignId: number;
}

export default function RecipientsList({ campaignId }: RecipientsListProps) {
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [csvUploadLoading, setCsvUploadLoading] = useState(false);
  const [participantLoadingk, setParticipantLoading] = useState(false);
  const [managerLoading, setManagerLoading] = useState(false);
  
  // Fetch recipients
  useEffect(() => {
    fetchRecipients();
  }, [pagination.page, searchQuery]);
  
  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/organizer/email/campaigns/${campaignId}/recipients`, window.location.origin);
      url.searchParams.append('page', pagination.page.toString());
      url.searchParams.append('limit', pagination.limit.toString());
      
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setRecipients(data.recipients);
        setPagination(data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to load recipients",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching recipients:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle CSV upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setCsvUploadLoading(true);
    
    try {
      const response = await fetch(`/api/organizer/email/campaigns/${campaignId}/recipients/csv`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Added ${result.added} recipients from CSV file`,
        });
        fetchRecipients();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upload CSV",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setCsvUploadLoading(false);
      // Reset the file input
      e.target.value = '';
    }
  };
  
  // Handle collection from participants
  const collectFromParticipants = async () => {
    setParticipantLoading(true);
    try {
      const response = await fetch(`/api/organizer/email/campaigns/${campaignId}/recipients/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: {} }), // No filters for simplicity
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Added ${result.added} recipients from participants`,
        });
        fetchRecipients();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to collect from participants",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setParticipantLoading(false);
    }
  };
  
  // Handle collection from managers
  const collectFromManagers = async () => {
    setManagerLoading(true);
    try {
      const response = await fetch(`/api/organizer/email/campaigns/${campaignId}/recipients/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: {} }), // No filters for simplicity
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Added ${result.added} recipients from managers`,
        });
        fetchRecipients();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to collect from managers",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setManagerLoading(false);
    }
  };
  
  // Delete selected recipients
  const deleteSelectedRecipients = async () => {
    if (selectedRecipients.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedRecipients.length} selected recipient(s)?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/organizer/email/campaigns/${campaignId}/recipients`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIds: selectedRecipients }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Deleted ${result.deleted} recipients`,
        });
        setSelectedRecipients([]);
        fetchRecipients();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete recipients",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Toggle selection of a recipient
  const toggleRecipientSelection = (id: number) => {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(recId => recId !== id) : [...prev, id]
    );
  };
  
  // Toggle selection of all recipients
  const toggleAllRecipients = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(recipients.map(r => r.id));
    }
  };
  
  // Get badge color for delivery status
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'bg-gray-200 text-gray-800';
      case 'SENT': return 'bg-green-200 text-green-800';
      case 'FAILED': return 'bg-red-200 text-red-800';
      case 'OPENED': return 'bg-blue-200 text-blue-800';
      case 'CLICKED': return 'bg-purple-200 text-purple-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full"
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileUpIcon className="mr-2 h-4 w-4" />
                Add Recipients
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <label className="flex items-center w-full cursor-pointer">
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Upload CSV
                  <Input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleCsvUpload} 
                    disabled={csvUploadLoading}
                  />
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={collectFromParticipants} disabled={participantLoadingk}>
                <UsersIcon className="mr-2 h-4 w-4" />
                From Participants
                {participantLoadingk && <LoaderIcon className="ml-2 h-3 w-3 animate-spin" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={collectFromManagers} disabled={managerLoading}>
                <UsersIcon className="mr-2 h-4 w-4" />
                From Managers
                {managerLoading && <LoaderIcon className="ml-2 h-3 w-3 animate-spin" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {selectedRecipients.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={deleteSelectedRecipients}
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          )}
        </div>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input 
                  type="checkbox" 
                  checked={selectedRecipients.length === recipients.length && recipients.length > 0}
                  onChange={toggleAllRecipients}
                  disabled={recipients.length === 0}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  <LoaderIcon className="h-5 w-5 mx-auto animate-spin" />
                </TableCell>
              </TableRow>
            ) : recipients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  No recipients found
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell>
                    <input 
                      type="checkbox" 
                      checked={selectedRecipients.includes(recipient.id)}
                      onChange={() => toggleRecipientSelection(recipient.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>{recipient.email}</TableCell>
                  <TableCell>{recipient.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{recipient.source}</Badge>
                  </TableCell>
                  <TableCell>
                    {recipient.outgoing_email ? (
                      <Badge className={getStatusColor(recipient.outgoing_email.delivery_status)}>
                        {recipient.outgoing_email.delivery_status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{recipient.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - 
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
