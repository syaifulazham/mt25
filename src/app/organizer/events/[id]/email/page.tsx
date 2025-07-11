'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MailCheck, MailX, SendHorizonal } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AttendanceManager {
  id: number;
  name: string;
  email: string | null;
  email_status: string | null;
  contingentName: string;
  state: string | null;
  attendanceStatus: string;
}

export default function ManagerEmailPage() {
  const params = useParams();
  const eventId = params.id;
  
  const [managers, setManagers] = useState<AttendanceManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedManagers, setSelectedManagers] = useState<number[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Fetch attendance managers
  useEffect(() => {
    const fetchManagers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/organizer/events/${eventId}/email/managers`);
        if (!response.ok) {
          throw new Error('Failed to fetch managers');
        }
        const data = await response.json();
        setManagers(data.managers);
      } catch (error) {
        console.error('Error fetching managers:', error);
        toast({
          title: 'Error',
          description: 'Failed to load manager data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchManagers();
    }
  }, [eventId]);

  // Handle checkbox selection
  const toggleSelectManager = (managerId: number) => {
    setSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      } else {
        return [...prev, managerId];
      }
    });
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedManagers.length === managers.length) {
      setSelectedManagers([]);
    } else {
      setSelectedManagers(managers.map(manager => manager.id));
    }
  };

  // Handle send email
  const handleSendEmail = async (managerId: number) => {
    setSendingEmail(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerIds: [managerId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const result = await response.json();
      
      // Update the local state to reflect the new status
      setManagers(managers.map(manager => 
        manager.id === managerId 
          ? { ...manager, email_status: 'SENT' } 
          : manager
      ));

      toast({
        title: 'Success',
        description: 'Email sent successfully',
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle bulk send email
  const handleBulkSendEmail = async () => {
    if (selectedManagers.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one manager to send emails.',
        variant: 'default',
      });
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerIds: selectedManagers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send emails');
      }

      const result = await response.json();
      
      // Update the local state to reflect the new status
      setManagers(managers.map(manager => 
        selectedManagers.includes(manager.id) 
          ? { ...manager, email_status: 'SENT' } 
          : manager
      ));

      toast({
        title: 'Success',
        description: `Emails sent to ${selectedManagers.length} managers`,
      });
      
      // Clear selections after successful send
      setSelectedManagers([]);
    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to send emails. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle sending test email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    
    setSendingTestEmail(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmailAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: `Test email sent to ${testEmailAddress}`,
      });
      
      // Close the dialog and reset email address
      setTestEmailOpen(false);
      setTestEmailAddress('');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Render email status badge
  const renderEmailStatus = (status: string | null) => {
    switch(status) {
      case 'SENT':
        return <Badge className="bg-green-500"><MailCheck className="h-4 w-4 mr-1" /> Sent</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500"><MailX className="h-4 w-4 mr-1" /> Failed</Badge>;
      case 'PENDING':
      default:
        return <Badge className="bg-yellow-500"><Mail className="h-4 w-4 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manager Email</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Manager List</span>
            <div className="flex gap-2">
              <Button 
                onClick={() => setTestEmailOpen(true)} 
                variant="outline"
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                <SendHorizonal className="h-4 w-4 mr-2" />
                Send Test Email
              </Button>
              <Button 
                onClick={handleBulkSendEmail} 
                disabled={loading || sendingEmail || selectedManagers.length === 0}
                variant="default"
              >
                {sendingEmail ? <Spinner className="mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Emails ({selectedManagers.length})
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Spinner className="h-8 w-8" />
              <span className="ml-2">Loading managers...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableCaption>List of managers for email communication</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">
                      <Checkbox 
                        checked={selectedManagers.length === managers.length && managers.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Contingent</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        No managers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    managers.map((manager, index) => (
                      <TableRow key={manager.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedManagers.includes(manager.id)}
                            onCheckedChange={() => toggleSelectManager(manager.id)}
                            aria-label={`Select manager ${manager.name}`}
                          />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{manager.state || 'N/A'}</TableCell>
                        <TableCell>{manager.contingentName}</TableCell>
                        <TableCell>{manager.name}</TableCell>
                        <TableCell>{manager.email || 'No email'}</TableCell>
                        <TableCell>
                          {renderEmailStatus(manager.email_status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(manager.id)}
                            disabled={!manager.email || sendingEmail || manager.email_status === 'SENT'}
                          >
                            <Mail className="h-4 w-4 mr-1" /> Send
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Email Dialog */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              This will send a test email with a randomly generated QR code to the specified email address.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="testEmail">Email address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="example@email.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                disabled={sendingTestEmail}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestEmailOpen(false)}
              disabled={sendingTestEmail}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSendTestEmail}
              disabled={!testEmailAddress || sendingTestEmail}
              className="ml-2"
            >
              {sendingTestEmail ? <Spinner className="mr-2" /> : null}
              {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
