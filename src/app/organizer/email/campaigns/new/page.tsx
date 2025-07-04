"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeftIcon, LoaderIcon } from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: number, template_name: string }>>([]);
  const [campaignData, setCampaignData] = useState({
    campaign_name: '',
    description: '',
    template_id: '',
  });

  // Load templates when component mounts
  useState(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/organizer/email/templates');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCampaignData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setCampaignData(prev => ({
      ...prev,
      template_id: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!campaignData.campaign_name.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare data for submission - convert 'none' template_id to null
      const submissionData = {
        ...campaignData,
        template_id: campaignData.template_id === 'none' ? null : campaignData.template_id
      };
      
      const response = await fetch('/api/organizer/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: "Campaign created successfully!",
        });
        
        // Navigate to the campaign edit page to continue setup
        router.push(`/organizer/email/campaigns/${result.id}`);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create campaign",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/organizer/email/campaigns" className="flex items-center text-sm text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaigns
        </Link>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Campaign</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign_name">Campaign Name *</Label>
              <Input
                id="campaign_name"
                name="campaign_name"
                value={campaignData.campaign_name}
                onChange={handleInputChange}
                placeholder="Enter campaign name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={campaignData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this campaign"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template_id">Email Template</Label>
              <Select 
                value={campaignData.template_id} 
                onValueChange={handleSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Choose later)</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">You can select or change the template later</p>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push('/organizer/email/campaigns')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
