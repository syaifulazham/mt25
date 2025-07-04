"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, InfoIcon, LoaderIcon, MailIcon, SendIcon } from 'lucide-react';

interface EmailCampaign {
  id: number;
  campaign_name: string;
  description: string | null;
  status: string;
  template_id: number | null;
  template: {
    id: number;
    template_name: string;
    subject: string;
  } | null;
  total_recipients: number;
}

export default function SendCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const campaignId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // Load campaign data
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/organizer/email/campaigns/${campaignId}`);
        if (response.ok) {
          const data = await response.json();
          setCampaign(data);
          
          // Set default schedule time to now + 1 hour
          const now = new Date();
          now.setHours(now.getHours() + 1);
          setScheduleDate(format(now, 'yyyy-MM-dd'));
          setScheduleTime(format(now, 'HH:mm'));
        } else {
          toast({
            title: "Error",
            description: "Failed to load campaign details",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching campaign:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  // Check if campaign can be sent (has template and recipients)
  const canSend = campaign && 
    campaign.template_id !== null && 
    campaign.total_recipients > 0 && 
    ['DRAFT', 'SCHEDULED'].includes(campaign.status);

  // Handle send campaign
  const handleSendCampaign = async () => {
    if (!campaign) return;
    
    // Validate
    if (!canSend) {
      toast({
        title: "Cannot Send Campaign",
        description: "Campaign must have a template and recipients to be sent.",
        variant: "destructive",
      });
      return;
    }
    
    setSending(true);
    
    try {
      let payload: any = {};
      
      if (scheduleEnabled) {
        // Validate date and time
        if (!scheduleDate || !scheduleTime) {
          toast({
            title: "Invalid Schedule",
            description: "Please provide a valid date and time for scheduling.",
            variant: "destructive",
          });
          setSending(false);
          return;
        }
        
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
        if (isNaN(scheduledDateTime.getTime()) || scheduledDateTime <= new Date()) {
          toast({
            title: "Invalid Schedule",
            description: "Please provide a future date and time for scheduling.",
            variant: "destructive",
          });
          setSending(false);
          return;
        }
        
        payload.scheduleDateTime = scheduledDateTime.toISOString();
      } else {
        payload.sendNow = true;
      }
      
      const response = await fetch(`/api/organizer/email/campaigns/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: scheduleEnabled 
            ? `Campaign scheduled for ${format(new Date(`${scheduleDate}T${scheduleTime}`), 'MMM d, yyyy h:mm a')}` 
            : `Campaign sending initiated. ${result.recipientCount} emails are being sent.`,
        });
        
        // Navigate back to campaign details
        router.push(`/organizer/email/campaigns/${campaignId}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send campaign",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[50vh]">
        <div className="flex items-center">
          <LoaderIcon className="h-8 w-8 mr-2 animate-spin" />
          <span>Loading campaign data...</span>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Link href="/organizer/email/campaigns" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Campaigns
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-center">
          <h2 className="text-xl font-semibold text-red-700">Campaign Not Found</h2>
          <p className="mt-2">The requested campaign could not be found or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }

  if (!canSend) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Link href={`/organizer/email/campaigns/${campaignId}`} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Campaign
          </Link>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-center">
          <h2 className="text-xl font-semibold text-yellow-700">Cannot Send Campaign</h2>
          <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
            {!campaign.template_id && (
              <div className="flex items-center gap-2 text-yellow-700">
                <InfoIcon className="h-5 w-5 flex-shrink-0" />
                <span>No email template selected. Please edit the campaign to select a template.</span>
              </div>
            )}
            {campaign.total_recipients <= 0 && (
              <div className="flex items-center gap-2 text-yellow-700">
                <InfoIcon className="h-5 w-5 flex-shrink-0" />
                <span>No recipients added to this campaign. Please add recipients before sending.</span>
              </div>
            )}
            {!['DRAFT', 'SCHEDULED'].includes(campaign.status) && (
              <div className="flex items-center gap-2 text-yellow-700">
                <InfoIcon className="h-5 w-5 flex-shrink-0" />
                <span>This campaign is already in progress or completed and cannot be sent again.</span>
              </div>
            )}
          </div>
          <Link href={`/organizer/email/campaigns/${campaignId}`} passHref>
            <Button variant="outline" className="mt-4">
              Return to Campaign Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href={`/organizer/email/campaigns/${campaignId}`} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaign
        </Link>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Send Campaign</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Campaign Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Campaign Name</div>
                <div className="font-medium">{campaign.campaign_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-medium">{campaign.status}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Recipients</div>
                <div className="font-medium">{campaign.total_recipients}</div>
              </div>
              {campaign.template && (
                <div>
                  <div className="text-sm text-gray-500">Email Template</div>
                  <div className="font-medium">{campaign.template.template_name}</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="schedule-switch" className="text-base font-medium">Schedule for Later</Label>
                <p className="text-sm text-gray-500">Set a future date and time to send this campaign</p>
              </div>
              <Switch
                id="schedule-switch"
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
              />
            </div>
            
            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-date">Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      id="schedule-date" 
                      type="date" 
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="pl-10"
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-time">Time</Label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      id="schedule-time" 
                      type="time" 
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-md w-full">
            <div className="flex items-start gap-2 text-sm">
              <InfoIcon className="h-5 w-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-yellow-800">Important:</span> {scheduleEnabled
                  ? "Your campaign will be sent at the scheduled time. Make sure all recipient information and email templates are finalized."
                  : "Your campaign will be sent immediately to all recipients. This action cannot be undone."}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/organizer/email/campaigns/${campaignId}`)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendCampaign}
              disabled={sending}
              className="gap-2"
            >
              {sending ? (
                <LoaderIcon className="h-4 w-4 animate-spin" />
              ) : scheduleEnabled ? (
                <CalendarIcon className="h-4 w-4" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
              {scheduleEnabled ? "Schedule Campaign" : "Send Now"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
