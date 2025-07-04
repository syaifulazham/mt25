"use client";

import { useState, useEffect } from 'react';
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

interface Template {
  id: number;
  template_name: string;
}

interface Campaign {
  id: number;
  campaign_name: string;
  description: string | null;
  template_id: number | null;
  status: string;
}

export default function EditCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const campaignId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaignData, setCampaignData] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    campaign_name: '',
    description: '',
    template_id: '',
  });

  // Load campaign data and templates when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch campaign data
        const campaignResponse = await fetch(`/api/organizer/email/campaigns/${campaignId}`);
        if (!campaignResponse.ok) {
          throw new Error('Failed to load campaign');
        }
        const campaignResult = await campaignResponse.json();
        setCampaignData(campaignResult);
        
        // Initialize form data
        setFormData({
          campaign_name: campaignResult.campaign_name,
          description: campaignResult.description || '',
          template_id: campaignResult.template_id ? String(campaignResult.template_id) : '',
        });
        
        // Fetch templates
        const templatesResponse = await fetch('/api/organizer/email/templates');
        if (templatesResponse.ok) {
          const templatesResult = await templatesResponse.json();
          setTemplates(templatesResult);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load campaign data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      template_id: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.campaign_name.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await fetch(`/api/organizer/email/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Campaign updated successfully!",
        });
        
        // Navigate back to the campaign details page
        router.push(`/organizer/email/campaigns/${campaignId}`);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update campaign",
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
      setSaving(false);
    }
  };

  // Check if campaign is editable (not in progress or completed)
  const isEditable = campaignData && !['IN_PROGRESS', 'COMPLETED'].includes(campaignData.status);

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

  if (!campaignData) {
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

  if (!isEditable) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Link href={`/organizer/email/campaigns/${campaignId}`} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Campaign
          </Link>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-center">
          <h2 className="text-xl font-semibold text-yellow-700">Cannot Edit Campaign</h2>
          <p className="mt-2">This campaign cannot be edited because it is already in progress or completed.</p>
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
          <CardTitle className="text-2xl">Edit Campaign</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign_name">Campaign Name *</Label>
              <Input
                id="campaign_name"
                name="campaign_name"
                value={formData.campaign_name}
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
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this campaign"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template_id">Email Template</Label>
              <Select 
                value={formData.template_id} 
                onValueChange={handleSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Choose later)</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select the email template for this campaign. You must select a template before sending the campaign.
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push(`/organizer/email/campaigns/${campaignId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
