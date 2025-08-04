'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type EventInfo = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  zoneName: string;
};

type Token = {
  id: number;
  eventToken: string;
  consumed: boolean;
  emailedTo?: string;
  notes?: string;
  createdAt: string;
};

const emailToken = async (tokenId: number, email: string) => {
  try {
    const response = await fetch(`/api/organizer/tokens/consume/${tokenId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailedTo: email }),
    });

    if (!response.ok) throw new Error('Failed to send token');
    return true;
  } catch (error) {
    console.error('Error sending token:', error);
    return false;
  }
};

export default function EventTokenManagementPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tokenCount, setTokenCount] = useState(10);
  const [emailingToken, setEmailingToken] = useState<number | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'consumed'>('all');

  const fetchTokens = async () => {
    try {
      const response = await fetch(`/api/organizer/events/monitoring/token/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const data = await response.json();
      setTokens(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tokens',
        variant: 'destructive',
      });
    }
  };

  const filteredTokens = tokens.filter(token => {
    // Search filter
    const matchesSearch = token.eventToken.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && !token.consumed) || 
      (statusFilter === 'consumed' && token.consumed);
    
    return matchesSearch && matchesStatus;
  });

  const openEmailDialog = (tokenId: number) => {
    setEmailingToken(tokenId);
    setEmailAddress('');
    setEmailDialogOpen(true);
  };

  const handleEmailToken = async () => {
    if (!emailingToken || !emailAddress) return;
    
    try {
      const success = await emailToken(emailingToken, emailAddress);
      if (success) {
        toast({
          title: 'Success',
          description: `Token emailed to ${emailAddress}`,
        });
        setEmailDialogOpen(false);
        await fetchTokens();
      } else {
        throw new Error();
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to email token',
        variant: 'destructive',
      });
    } finally {
      setEmailingToken(null);
    }
  };

  const generateTokens = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/organizer/events/monitoring/token/${eventId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: tokenCount }),
      });

      if (!response.ok) throw new Error('Failed to generate tokens');
      
      await fetchTokens();
      toast({
        title: 'Success',
        description: `Generated ${tokenCount} new tokens`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate tokens',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch event info
        const eventResponse = await fetch(`/api/organizer/events/${eventId}`);
        if (!eventResponse.ok) throw new Error('Failed to fetch event info');
        const eventData = await eventResponse.json();
        setEventInfo(eventData);

        // Fetch tokens
        await fetchTokens();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center p-8">
          Loading event information...
        </div>
      </DashboardShell>
    );
  }

  if (!eventInfo) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center p-8">
          Event not found
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <PageHeader
          title={`Token Management - ${eventInfo.name}`}
          description={`Manage tokens for ${eventInfo.zoneName} zone event`}
        />
        
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Input 
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="consumed">Consumed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                min="1" 
                max="100"
                value={tokenCount}
                onChange={(e) => setTokenCount(Number(e.target.value))}
                className="w-20"
              />
              <span>tokens</span>
            </div>
            <Button onClick={generateTokens} disabled={generating}>
              {generating ? 'Generating...' : 'Generate New Tokens'}
            </Button>
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <TableRow key={token.id} className={token.consumed ? 'bg-red-100' : (token.emailedTo ? 'bg-green-100' : '')}>
                    <TableCell className="font-mono">{token.eventToken}</TableCell>
                    <TableCell>{format(new Date(token.createdAt), 'dd MMM yyyy HH:mm')}</TableCell>
                    <TableCell>
                      {token.emailedTo ? (
                        <span className="font-medium text-green-600">{token.emailedTo}</span>
                      ) : token.consumed ? (
                        <div className="text-red-600">
                          <div className="font-medium">Consumed</div>
                          {token.notes && (
                            <div className="text-sm text-gray-600 mt-1">{token.notes}</div>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="mr-2"
                          disabled={emailingToken === token.id}
                          onClick={() => openEmailDialog(token.id)}
                        >
                          {emailingToken === token.id ? 'Processing...' : 'Email to'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    No tokens match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Token</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address to send the token and mark it as consumed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Email address"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="w-full"
              type="email"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEmailToken}
              disabled={!emailAddress || emailAddress.trim() === ''}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
