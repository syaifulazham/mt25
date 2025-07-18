'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  TrashIcon, 
  DragHandleDots2Icon,
  CheckCircledIcon
} from '@radix-ui/react-icons';
import { judgingTemplateApi } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types
interface JudgingCriteria {
  id?: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
  evaluationType: string;
  discreteValues?: string[];
  needsJuryCourtesy?: boolean;
}

interface JudgingTemplate {
  id?: string;
  name: string;
  description: string;
  contestType: string;
  isDefault: boolean;
  judgingtemplatecriteria: JudgingCriteria[];
}

// Sortable Criteria Item Component
function SortableCriteriaItem({ 
  criteria, 
  index, 
  onEdit, 
  onDelete 
}: { 
  criteria: JudgingCriteria; 
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: criteria.id || `new-${index}`});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getEvaluationTypeLabel = (type: string) => {
    switch (type) {
      case 'POINTS': return 'Points';
      case 'TIME': return 'Time';
      case 'DISCRETE': return 'Discrete Values';
      default: return type;
    }
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <div 
          className="cursor-move flex items-center justify-center" 
          {...attributes} 
          {...listeners}
        >
          <DragHandleDots2Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{criteria.name}</TableCell>
      <TableCell className="max-w-[200px] truncate">{criteria.description}</TableCell>
      <TableCell>{getEvaluationTypeLabel(criteria.evaluationType)}</TableCell>
      <TableCell>
        {criteria.evaluationType === 'POINTS' && `${criteria.maxScore} points`}
        {criteria.evaluationType === 'TIME' && 'Time-based'}
        {criteria.evaluationType === 'DISCRETE' && 
          criteria.discreteValues?.join(', ')}
      </TableCell>
      <TableCell>{criteria.weight}%</TableCell>
      <TableCell>
        {criteria.needsJuryCourtesy && (
          <CheckCircledIcon className="h-4 w-4 text-green-600" />
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(index)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
            >
              <path
                d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42166 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42166 9.28547Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(index)}
          >
            <TrashIcon className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Criteria Edit Form Component
function CriteriaEditForm({
  criteria,
  onSave,
  onCancel,
}: {
  criteria: JudgingCriteria;
  onSave: (criteria: JudgingCriteria) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<JudgingCriteria>(criteria);
  const [discreteValuesInput, setDiscreteValuesInput] = useState(
    criteria.discreteValues?.join(', ') || ''
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEvaluationTypeChange = (value: string) => {
    setFormData({ 
      ...formData, 
      evaluationType: value,
      // Reset maxScore for non-points evaluation types
      ...(value !== 'POINTS' && { maxScore: 0 })
    });
  };

  const handleSave = () => {
    // Process discrete values if applicable
    let updatedCriteria = { ...formData };
    
    if (formData.evaluationType === 'DISCRETE') {
      const values = discreteValuesInput
        .split(',')
        .map(v => v.trim())
        .filter(v => v);
      
      updatedCriteria.discreteValues = values;
    }
    
    onSave(updatedCriteria);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{criteria.id ? 'Edit Criterion' : 'Add Criterion'}</CardTitle>
        <CardDescription>
          Define how this criterion will be evaluated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Technical Implementation"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Explain what judges should look for when evaluating this criterion"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="evaluationType">Evaluation Type</Label>
              <Select
                value={formData.evaluationType}
                onValueChange={handleEvaluationTypeChange}
              >
                <SelectTrigger id="evaluationType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POINTS">Points</SelectItem>
                  <SelectItem value="TIME">Time</SelectItem>
                  <SelectItem value="DISCRETE">Discrete Values</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.evaluationType === 'POINTS' && (
              <div className="grid gap-2">
                <Label htmlFor="maxScore">Maximum Score</Label>
                <Input
                  id="maxScore"
                  name="maxScore"
                  type="number"
                  min="1"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maxScore: parseInt(e.target.value) || 0 
                  })}
                  placeholder="e.g., 10"
                />
              </div>
            )}
            
            {formData.evaluationType === 'DISCRETE' && (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="discreteValues">Discrete Values</Label>
                <Input
                  id="discreteValues"
                  value={discreteValuesInput}
                  onChange={(e) => setDiscreteValuesInput(e.target.value)}
                  placeholder="e.g., Excellent, Good, Fair, Poor (comma-separated)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter comma-separated values
                </p>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="weight">Weight (%)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                min="1"
                max="100"
                value={formData.weight}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  weight: parseInt(e.target.value) || 0 
                })}
                placeholder="e.g., 20"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <Switch
              id="needsJuryCourtesy"
              checked={formData.needsJuryCourtesy || false}
              onCheckedChange={(checked) => setFormData({ 
                ...formData, 
                needsJuryCourtesy: checked 
              })}
            />
            <Label htmlFor="needsJuryCourtesy">Requires Jury Courtesy</Label>
            <p className="text-xs text-muted-foreground ml-2">
              Flag this criterion for special consideration by the jury
            </p>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Criterion
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNewTemplate = params.id === 'new';
  const [isLoading, setIsLoading] = useState(!isNewTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  
  // Template state
  const [template, setTemplate] = useState<JudgingTemplate>({
    name: '',
    description: '',
    contestType: '',
    isDefault: false,
    judgingtemplatecriteria: []
  });
  
  // Criteria editing state
  const [editingCriteriaIndex, setEditingCriteriaIndex] = useState<number | null>(null);
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch template data if editing
  useEffect(() => {
    if (!isNewTemplate) {
      const fetchTemplate = async () => {
        try {
          const data = await judgingTemplateApi.getJudgingTemplate(params.id as string);
          setTemplate(data);
        } catch (error) {
          console.error('Error fetching template:', error);
          toast.error('Failed to load template');
          router.push('/organizer/judging-templates');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchTemplate();
    }
  }, [params.id, isNewTemplate, router]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplate({ ...template, [name]: value });
  };

  // Handle contest type selection
  const handleContestTypeChange = (value: string) => {
    // If ANY is selected, set contestType to empty string in the database
    setTemplate({ ...template, contestType: value === "ANY" ? "" : value });
  };

  // Handle default toggle
  const handleDefaultToggle = (checked: boolean) => {
    setTemplate({ ...template, isDefault: checked });
  };

  // Add/Edit criteria
  const handleAddCriteria = () => {
    setEditingCriteriaIndex(null);
    setShowCriteriaForm(true);
  };

  const handleEditCriteria = (index: number) => {
    setEditingCriteriaIndex(index);
    setShowCriteriaForm(true);
  };

  const handleSaveCriteria = (criteria: JudgingCriteria) => {
    let updatedCriteria;
    
    if (editingCriteriaIndex !== null) {
      // Update existing criteria
      updatedCriteria = [...template.judgingtemplatecriteria];
      updatedCriteria[editingCriteriaIndex] = criteria;
    } else {
      // Add new criteria
      updatedCriteria = [...template.judgingtemplatecriteria, criteria];
    }
    
    setTemplate({ ...template, judgingtemplatecriteria: updatedCriteria });
    setShowCriteriaForm(false);
    setEditingCriteriaIndex(null);
  };

  const handleCancelCriteriaEdit = () => {
    setShowCriteriaForm(false);
    setEditingCriteriaIndex(null);
  };

  const handleDeleteCriteria = (index: number) => {
    const updatedCriteria = [...template.judgingtemplatecriteria];
    updatedCriteria.splice(index, 1);
    setTemplate({ ...template, judgingtemplatecriteria: updatedCriteria });
  };

  // Handle drag end for reordering criteria
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = template.judgingtemplatecriteria.findIndex(
        (c, i) => (c.id || `new-${i}`) === active.id
      );
      const newIndex = template.judgingtemplatecriteria.findIndex(
        (c, i) => (c.id || `new-${i}`) === over.id
      );
      
      setTemplate({
        ...template,
        judgingtemplatecriteria: arrayMove(template.judgingtemplatecriteria, oldIndex, newIndex),
      });
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    // Validate template
    if (!template.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    if (template.judgingtemplatecriteria.length === 0) {
      toast.error('At least one criterion is required');
      return;
    }
    
    // Validate criteria weights sum to 100%
    const totalWeight = template.judgingtemplatecriteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight !== 100) {
      toast.error(`Criteria weights must sum to 100% (currently ${totalWeight}%)`);
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Transform template data to match API expectations
      // API expects criteria in a 'criteria' property, not 'judgingtemplatecriteria'
      const apiPayload = {
        ...template,
        criteria: template.judgingtemplatecriteria
      };
      
      if (isNewTemplate) {
        // Create new template
        const createdTemplate = await judgingTemplateApi.createJudgingTemplate(apiPayload);
        toast.success('Template created successfully');
        router.push(`/organizer/judging-templates/${createdTemplate.id}`);
      } else {
        // Update existing template
        await judgingTemplateApi.updateJudgingTemplate(params.id as string, apiPayload);
        toast.success('Template updated successfully');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async () => {
    try {
      await judgingTemplateApi.deleteJudgingTemplate(params.id as string);
      toast.success('Template deleted successfully');
      router.push('/organizer/judging-templates');
    } catch (error: any) {
      console.error('Error deleting template:', error);
      
      // Check if the error is because the template is in use
      if (error.response?.data?.contests) {
        toast.error('Cannot delete template as it is in use by contests');
      } else {
        toast.error('Failed to delete template');
      }
    } finally {
      setShowDeleteAlert(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/organizer/judging-templates')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            {isNewTemplate ? 'Create Template' : 'Edit Template'}
          </h1>
        </div>
        
        <div className="flex gap-2">
          {!isNewTemplate && (
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteAlert(true)}
            >
              Delete
            </Button>
          )}
          <Button 
            onClick={handleSaveTemplate} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Template Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Define the basic information for this judging template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                name="name"
                value={template.name}
                onChange={handleInputChange}
                placeholder="e.g., Hackathon Judging Template"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={template.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose and use case for this template"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contestType">Contest Type</Label>
                <Select
                  value={template.contestType || "ANY"}
                  onValueChange={handleContestTypeChange}
                >
                  <SelectTrigger id="contestType">
                    <SelectValue placeholder="Select contest type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Any contest type</SelectItem>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                    <SelectItem value="CODING">Coding</SelectItem>
                    <SelectItem value="STRUCTURE_BUILDING">Structure Building</SelectItem>
                    <SelectItem value="FASTEST_COMPLETION">Fastest Completion</SelectItem>
                    <SelectItem value="POSTER_PRESENTATION">Poster Presentation</SelectItem>
                    <SelectItem value="SCIENCE_PROJECT">Science Project</SelectItem>
                    <SelectItem value="ENGINEERING_DESIGN">Engineering Design</SelectItem>
                    <SelectItem value="ANALYSIS_CHALLENGE">Analysis Challenge</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Specifying a contest type allows this template to be suggested for that type
                </p>
              </div>
              
              <div className="flex items-center space-x-2 self-end mb-2">
                <Switch
                  id="isDefault"
                  checked={template.isDefault}
                  onCheckedChange={handleDefaultToggle}
                />
                <Label htmlFor="isDefault">Set as default template</Label>
                <p className="text-xs text-muted-foreground ml-2">
                  {template.contestType 
                    ? `This will be the default template for ${template.contestType.toLowerCase()} contests` 
                    : 'This will be the default template for all contests'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criteria Section */}
      {showCriteriaForm ? (
        <CriteriaEditForm
          criteria={
            editingCriteriaIndex !== null
              ? template.judgingtemplatecriteria[editingCriteriaIndex]
              : {
                  name: '',
                  description: '',
                  maxScore: 10,
                  weight: 0,
                  evaluationType: 'POINTS',
                }
          }
          onSave={handleSaveCriteria}
          onCancel={handleCancelCriteriaEdit}
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Judging Criteria</CardTitle>
              <CardDescription>
                Define the criteria that will be used to evaluate submissions
              </CardDescription>
            </div>
            <Button onClick={handleAddCriteria}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Criterion
            </Button>
          </CardHeader>
          <CardContent>
            {template.judgingtemplatecriteria.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground mb-4">No criteria defined yet</p>
                <Button onClick={handleAddCriteria}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add your first criterion
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scale</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Jury Courtesy</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={template.judgingtemplatecriteria.map(
                        (c, i) => c.id || `new-${i}`
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      {template.judgingtemplatecriteria.map((criteria, index) => (
                        <SortableCriteriaItem
                          key={criteria.id || `new-${index}`}
                          criteria={criteria}
                          index={index}
                          onEdit={handleEditCriteria}
                          onDelete={handleDeleteCriteria}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Alert Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{template.name}" template.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
