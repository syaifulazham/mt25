'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  PlusIcon, 
  Pencil1Icon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  CheckCircledIcon
} from '@radix-ui/react-icons';
import { judgingTemplateApi } from '@/lib/api-client';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function JudgingTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contestTypeFilter, setContestTypeFilter] = useState('ALL');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  // Fetch all templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const data = await judgingTemplateApi.getJudgingTemplates();
        setTemplates(data);
      } catch (error) {
        console.error('Error fetching judging templates:', error);
        toast.error('Failed to load judging templates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Filter templates based on search query and contest type
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesContestType = contestTypeFilter === "ALL" || 
      template.contestType === contestTypeFilter;
    
    return matchesSearch && matchesContestType;
  });

  // Handle template deletion
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      await judgingTemplateApi.deleteJudgingTemplate(templateToDelete.id);
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      toast.success('Template deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting template:', error);
      
      // Check if the error is because the template is in use
      if (error.response?.data?.contests) {
        toast.error('Cannot delete template as it is in use by contests');
      } else {
        toast.error('Failed to delete template');
      }
    }
  };

  // Format contest type for display
  const formatContestType = (type: string) => {
    if (!type) return '';
    return type.replace(/_/g, ' ');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Judging Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage reusable judging templates for contests
          </p>
        </div>
        <Button onClick={() => router.push('/organizer/judging-templates/new')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                value={contestTypeFilter}
                onValueChange={setContestTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by contest type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All contest types</SelectItem>
                  <SelectItem value="HACKATHON">Hackathon</SelectItem>
                  <SelectItem value="PROGRAMMING">Programming</SelectItem>
                  <SelectItem value="DATASCIENCE">Data Science</SelectItem>
                  <SelectItem value="DESIGN">Design</SelectItem>
                  <SelectItem value="ROBOTICS">Robotics</SelectItem>
                  <SelectItem value="CYBERSECURITY">Cybersecurity</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground mb-4">No templates found</p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/organizer/judging-templates/new')}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create your first template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead className="w-[300px]">Description</TableHead>
                  <TableHead>Contest Type</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.description || '-'}</TableCell>
                    <TableCell>
                      {template.contestType ? (
                        <Badge variant="outline">
                          {formatContestType(template.contestType)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Any</span>
                      )}
                    </TableCell>
                    <TableCell>{template.judgingtemplatecriteria?.length || 0}</TableCell>
                    <TableCell>
                      {template.isDefault && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircledIcon className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/organizer/judging-templates/${template.id}`)}
                        >
                          <Pencil1Icon className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTemplateToDelete(template);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template "{templateToDelete?.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
