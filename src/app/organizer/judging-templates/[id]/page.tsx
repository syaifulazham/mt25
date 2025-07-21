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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
interface DiscreteValue {
  text: string;
  value: number;
}

interface DiscreteValuesTableProps {
  values: DiscreteValue[];
  onChange: (values: DiscreteValue[]) => void;
}

function DiscreteValuesTable({ values, onChange }: DiscreteValuesTableProps) {
  // Add a new empty row
  const handleAddRow = () => {
    onChange([...values, { text: '', value: 0 }]);
  };

  // Remove a row at the specified index
  const handleRemoveRow = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  // Update a specific field of a discrete value
  const handleValueChange = (index: number, field: 'text' | 'value', newValue: string | number) => {
    const newValues = [...values];
    if (field === 'text') {
      newValues[index].text = newValue as string;
    } else {
      newValues[index].value = Number(newValue);
    }
    onChange(newValues);
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60%]">Text</TableHead>
            <TableHead className="w-[30%]">Value</TableHead>
            <TableHead className="w-[10%] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {values.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                No discrete values defined. Click 'Add Value' below to create one.
              </TableCell>
            </TableRow>
          ) : (
            values.map((value, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input 
                    value={value.text} 
                    onChange={(e) => handleValueChange(index, 'text', e.target.value)}
                    placeholder="Option text (e.g. Excellent)"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    value={value.value} 
                    onChange={(e) => handleValueChange(index, 'value', e.target.value)}
                    placeholder="Score value"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveRow(index)}
                    title="Remove option"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="p-2 flex justify-end border-t">
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Value
        </Button>
      </div>
    </div>
  );
}

interface JudgingCriteria {
  id?: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
  evaluationType: string; // POINTS, TIME, DISCRETE_SINGLE, DISCRETE_MULTIPLE
  discreteValues?: string | DiscreteValue[]; // String for backward compatibility, DiscreteValue[] for new format
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
      case 'DISCRETE': return 'Discrete Values'; // For backward compatibility
      case 'DISCRETE_SINGLE': return 'Discrete (Single)';
      case 'DISCRETE_MULTIPLE': return 'Discrete (Multiple)';
      default: return type;
    }
  };
  
  const formatDiscreteValues = (discreteValues: string | DiscreteValue[] | undefined) => {
    if (!discreteValues) return '';
    
    // Handle string format (legacy or serialized JSON)
    if (typeof discreteValues === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(discreteValues);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
            // New format: [{text, value}]
            return parsed.map(item => `${item.text} (${item.value})`).join(', ');
          } else {
            // Legacy format: string[]
            return parsed.join(', ');
          }
        }
        return discreteValues;
      } catch (e) {
        // If not valid JSON, treat as legacy comma-separated string
        return discreteValues;
      }
    }
    
    // Handle DiscreteValue[] format
    if (Array.isArray(discreteValues)) {
      return discreteValues.map(item => `${item.text} (${item.value})`).join(', ');
    }
    
    return '';
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
      <TableCell>{getEvaluationTypeLabel(criteria.evaluationType)}</TableCell>
      <TableCell>
        {(() => {
          let scaleText = '';
          if (criteria.evaluationType === 'POINTS') {
            scaleText = `${criteria.maxScore} points`;
          } else if (criteria.evaluationType === 'TIME') {
            scaleText = 'Time-based';
          } else if (criteria.evaluationType === 'DISCRETE' || 
                     criteria.evaluationType === 'DISCRETE_SINGLE' || 
                     criteria.evaluationType === 'DISCRETE_MULTIPLE') {
            scaleText = formatDiscreteValues(criteria.discreteValues);
          }
          
          const truncatedText = scaleText.length > 15 ? scaleText.substring(0, 15) + '...' : scaleText;
          
          return scaleText.length > 15 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{truncatedText}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{scaleText}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span>{scaleText}</span>
          );
        })()}
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
  // Map backend DISCRETE to specific frontend type based on discreteValues
  const mapDiscreteType = (criteria: JudgingCriteria): string => {
    // If it's not DISCRETE, return as is
    if (criteria.evaluationType !== 'DISCRETE') {
      return criteria.evaluationType;
    }
    
    // Handle existing discreteValues
    try {
      // If discreteValues is a string, parse it
      if (typeof criteria.discreteValues === 'string') {
        const discreteValuesArray = JSON.parse(criteria.discreteValues);
        
        // Check if it's using the text/value object format (new format)
        if (Array.isArray(discreteValuesArray) && discreteValuesArray.length > 0 && 
            typeof discreteValuesArray[0] === 'object' && 'text' in discreteValuesArray[0]) {
          // If we can find evidence it's DISCRETE_MULTIPLE, return that
          // A good heuristic is to check if multiple values sum to > 1 (meaning multiple selections)
          let totalPossibleValue = 0;
          for (const item of discreteValuesArray) {
            totalPossibleValue += item.value;
          }
          
          // If total possible value > 1, it's likely DISCRETE_MULTIPLE
          return totalPossibleValue > 1 ? 'DISCRETE_MULTIPLE' : 'DISCRETE_SINGLE';
        }
      }
    } catch (e) {
      console.log('Error parsing discreteValues:', e);
    }
    
    // Default to DISCRETE_SINGLE if can't determine
    return 'DISCRETE_SINGLE';
  };
  
  // Initialize form data from criteria
  const [formData, setFormData] = useState<JudgingCriteria>({
    ...criteria,
    name: criteria.name || '',
    description: criteria.description || '',
    weight: criteria.weight || 0,
    maxScore: criteria.maxScore || 10,
    evaluationType: mapDiscreteType(criteria),
    needsJuryCourtesy: criteria.needsJuryCourtesy || false
  });

  // Initialize discrete values input based on the format of criteria.discreteValues
  const [discreteValues, setDiscreteValues] = useState<DiscreteValue[]>(() => {
    if (!criteria.discreteValues) return [];

    // If it's a string (either legacy format or JSON string)
    if (typeof criteria.discreteValues === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(criteria.discreteValues);
        if (Array.isArray(parsed)) {
          // Check if it's the new format with text/value objects
          if (parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
            return parsed;
          }
          // Legacy array format - convert to text/value objects
          return parsed.map((value: string | number, index: number) => ({
            text: String(value),
            value: index,
          }));
        }
        return [];
      } catch (e) {
        // Not JSON, assume it's comma-separated string format
        return criteria.discreteValues.split(',').map((v, i) => ({
          text: v.trim(),
          value: i,
        }));
      }
    }

    // If it's already an array of DiscreteValue objects
    if (Array.isArray(criteria.discreteValues)) {
      return criteria.discreteValues;
    }

    return [];
  });

  // For legacy DISCRETE type only - string input
  const [discreteValuesInput, setDiscreteValuesInput] = useState<string>(() => {
    if (!criteria.discreteValues) return '';

    if (typeof criteria.discreteValues === 'string') {
      try {
        const parsed = JSON.parse(criteria.discreteValues);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
            // Skip object format for legacy input
            return '';
          }
          return parsed.join(', ');
        }
        return criteria.discreteValues;
      } catch (e) {
        return criteria.discreteValues;
      }
    }

    return '';
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle changes from DiscreteValuesTable
  const handleDiscreteValuesChange = (values: DiscreteValue[]) => {
    setDiscreteValues(values);
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
    
    if (formData.evaluationType === 'DISCRETE' || 
        formData.evaluationType === 'DISCRETE_SINGLE' || 
        formData.evaluationType === 'DISCRETE_MULTIPLE') {
      
      if (formData.evaluationType === 'DISCRETE') {
        // Legacy format for backwards compatibility
        const values = discreteValuesInput
          .split(',')
          .map((v: string) => v.trim())
          .filter((v: string) => v);
        
        updatedCriteria.discreteValues = JSON.stringify(values);
      } else {
        // New format for DISCRETE_SINGLE and DISCRETE_MULTIPLE
        // Use the discrete values from the table UI
        updatedCriteria.discreteValues = JSON.stringify(discreteValues);
      }
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <SelectItem value="DISCRETE_SINGLE">Discrete (Single)</SelectItem>
                  <SelectItem value="DISCRETE_MULTIPLE">Discrete (Multiple)</SelectItem>
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
              <div className="grid gap-2">
                <Label htmlFor="discreteValues">Discrete Values (Legacy)</Label>
                <Textarea
                  id="discreteValues"
                  value={discreteValuesInput}
                  onChange={(e) => setDiscreteValuesInput(e.target.value)}
                  placeholder="e.g., Excellent, Good, Fair, Poor"
                  rows={3}
                />
                <div className="text-xs text-muted-foreground">
                  Enter comma-separated values for discrete scoring options
                </div>
              </div>
            )}
            
            {(formData.evaluationType === 'DISCRETE_SINGLE' || formData.evaluationType === 'DISCRETE_MULTIPLE') && (
              <div className="grid gap-2">
                <Label>
                  {formData.evaluationType === 'DISCRETE_SINGLE' ? 'Discrete Values (Single Selection)' : 'Discrete Values (Multiple Selection)'}
                </Label>
                <DiscreteValuesTable 
                  values={discreteValues}
                  onChange={handleDiscreteValuesChange}
                />
              </div>
            )}

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
    
    // Validation removed: Allow templates without criteria and without weight sum requirements
    
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
                <TooltipProvider>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scale</TableHead>

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
                </TooltipProvider>
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
