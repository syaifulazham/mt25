'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusIcon, CheckIcon } from 'lucide-react';
import { judgingTemplateApi } from '@/lib/api-client';

export default function TemplateSelector({ 
  contestId, 
  contestType, 
  onTemplateSelected, 
  onCreateNew,
  currentTemplateId: initialTemplateId
}: { 
  contestId: string;
  contestType?: string;
  onTemplateSelected: (templateId: string) => Promise<void>;
  onCreateNew: () => void;
  currentTemplateId?: string;
}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | undefined>(initialTemplateId);

  // Fetch templates and current contest template
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all templates
        const templatesData = await judgingTemplateApi.getJudgingTemplates(contestType);
        setTemplates(templatesData);
        
        // If no initial template ID was provided, fetch the current contest template
        if (!initialTemplateId) {
          const { template } = await judgingTemplateApi.getContestJudgingTemplate(contestId);
          if (template) {
            setCurrentTemplateId(template.id);
            setSelectedTemplateId(template.id);
          }
        } else {
          setSelectedTemplateId(initialTemplateId);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Failed to load judging templates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contestId, contestType, initialTemplateId]);

  // Handle template selection
  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    try {
      await onTemplateSelected(selectedTemplateId);
      setCurrentTemplateId(selectedTemplateId);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Judging Template</CardTitle>
        <CardDescription>
          Select an existing template or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a judging template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No templates available
                    </SelectItem>
                  ) : (
                    templates.map((template) => (
                      <SelectItem 
                        key={template.id} 
                        value={template.id}
                      >
                        {template.name} 
                        {template.isDefault && ' (Default)'} 
                        {template.id === currentTemplateId && ' (Current)'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                onClick={handleApplyTemplate} 
                className="w-full"
                disabled={!selectedTemplateId || selectedTemplateId === currentTemplateId}
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {currentTemplateId 
                ? `Current template: ${templates.find(t => t.id === currentTemplateId)?.name || 'Unknown'}`
                : 'No template currently applied'}
            </p>
            <Button 
              variant="outline" 
              onClick={onCreateNew}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
