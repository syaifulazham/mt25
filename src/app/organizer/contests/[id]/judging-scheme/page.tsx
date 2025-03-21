'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon, ArrowLeftIcon, SaveIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
import { contestApi, judgingTemplateApi } from '@/lib/api-client';
import TemplateSelector from '../../_components/template-selector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// Enum for evaluation types
enum EvaluationType {
  POINTS = 'POINTS',
  TIME = 'TIME',
  DISCRETE = 'DISCRETE'
}

interface JudgingCriterion {
  id?: string;
  name: string;
  description: string;
  requiresJuryCourtesy: boolean;
  evaluationType: EvaluationType;
  weight: number;
  maxScore: number | null;
  discreteValues: string[] | null;
}

interface JudgingTemplate {
  id?: string;
  name: string;
  description: string;
  isDefault: boolean;
  contestType: string;
  criteria: JudgingCriterion[];
}

export default function JudgingSchemeTemplate({ params }: { params: { id: string } }) {
  const router = useRouter();
  const contestId = params.id;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contest, setContest] = useState<any>(null);
  const [currentTemplate, setCurrentTemplate] = useState<JudgingTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isDefaultTemplate, setIsDefaultTemplate] = useState(false);
  const [criteria, setCriteria] = useState<JudgingCriterion[]>([]);
  const [newCriterion, setNewCriterion] = useState<JudgingCriterion>({
    name: '',
    description: '',
    requiresJuryCourtesy: false,
    evaluationType: EvaluationType.POINTS,
    weight: 10,
    maxScore: 10,
    discreteValues: ['Excellent', 'Good', 'Fair', 'Poor']
  });
  const [discreteValueInput, setDiscreteValueInput] = useState('');
  const [showAddCriterionModal, setShowAddCriterionModal] = useState(false);
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false);
  const [pendingAction, setPendingAction] = useState<'back' | 'template' | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch contest details and current template
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch contest details
        const contestData = await contestApi.getContest(parseInt(contestId));
        setContest(contestData);
        
        // Fetch current judging template if exists
        const { template } = await judgingTemplateApi.getContestJudgingTemplate(contestId);
        
        if (template) {
          setCurrentTemplate(template);
          setCriteria(template.criteria.map((criterion: any) => ({
            id: criterion.id,
            name: criterion.name,
            description: criterion.description || '',
            requiresJuryCourtesy: criterion.requiresJuryCourtesy || false,
            evaluationType: criterion.evaluationType,
            weight: criterion.weight,
            maxScore: criterion.maxScore,
            discreteValues: criterion.discreteValues
          })));
        } else {
          // No template assigned, show empty form
          setCriteria([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load contest details');
      } finally {
        setIsLoading(false);
      }
    };

    if (contestId) {
      fetchData();
    }
  }, [contestId]);

  // Track unsaved changes
  useEffect(() => {
    if (!isLoading && currentTemplate) {
      setHasUnsavedChanges(true);
    }
  }, [criteria]);

  // Handle template selection with unsaved changes check
  const handleTemplateSelected = async (templateId: string) => {
    if (hasUnsavedChanges) {
      setPendingTemplateId(templateId);
      setPendingAction('template');
      setShowUnsavedChangesAlert(true);
      return;
    }
    
    applyTemplate(templateId);
  };

  // Apply the selected template
  const applyTemplate = async (templateId: string) => {
    try {
      setIsLoading(true);
      
      // Assign template to contest
      await judgingTemplateApi.assignJudgingTemplate(contestId, templateId);
      
      // Fetch the selected template details
      const template = await judgingTemplateApi.getJudgingTemplate(templateId);
      setCurrentTemplate(template);
      
      // Update criteria state
      setCriteria(template.criteria.map((criterion: any) => ({
        id: criterion.id,
        name: criterion.name,
        description: criterion.description || '',
        requiresJuryCourtesy: criterion.requiresJuryCourtesy || false,
        evaluationType: criterion.evaluationType,
        weight: criterion.weight,
        maxScore: criterion.maxScore,
        discreteValues: criterion.discreteValues
      })));
      
      setIsCreatingNew(false);
      setHasUnsavedChanges(false);
      toast.success('Template applied successfully');
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back button with unsaved changes check
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setPendingAction('back');
      setShowUnsavedChangesAlert(true);
      return;
    }
    
    router.push(`/organizer/contests/${contestId}`);
  };

  // Handle unsaved changes dialog confirmation
  const handleUnsavedChangesConfirm = () => {
    if (pendingAction === 'back') {
      router.push(`/organizer/contests/${contestId}`);
    } else if (pendingAction === 'template' && pendingTemplateId) {
      applyTemplate(pendingTemplateId);
    }
    
    setShowUnsavedChangesAlert(false);
  };

  // Start creating a new template
  const handleCreateNew = () => {
    if (hasUnsavedChanges) {
      setPendingAction('template');
      setPendingTemplateId(null);
      setShowUnsavedChangesAlert(true);
      return;
    }
    
    setIsCreatingNew(true);
    setTemplateName('');
    setTemplateDescription('');
    setIsDefaultTemplate(false);
    setCriteria([]);
    setHasUnsavedChanges(false);
  };

  // Open add criterion modal
  const openAddCriterionModal = () => {
    // Reset the form
    setNewCriterion({
      name: '',
      description: '',
      requiresJuryCourtesy: false,
      evaluationType: EvaluationType.POINTS,
      weight: 10,
      maxScore: 10,
      discreteValues: ['Excellent', 'Good', 'Fair', 'Poor']
    });
    setDiscreteValueInput('');
    setShowAddCriterionModal(true);
  };

  // Add a discrete value to the list
  const handleAddDiscreteValue = () => {
    if (!discreteValueInput.trim()) {
      return;
    }
    
    setNewCriterion({
      ...newCriterion,
      discreteValues: [...(newCriterion.discreteValues || []), discreteValueInput.trim()]
    });
    
    setDiscreteValueInput('');
  };

  // Remove a discrete value from the list
  const handleRemoveDiscreteValue = (index: number) => {
    setNewCriterion({
      ...newCriterion,
      discreteValues: newCriterion.discreteValues?.filter((_, i) => i !== index) || []
    });
  };

  // Add a new criterion
  const handleAddCriterion = () => {
    if (!newCriterion.name) {
      toast.error('Criterion name is required');
      return;
    }

    // Validate based on evaluation type
    if (newCriterion.evaluationType === EvaluationType.POINTS && !newCriterion.maxScore) {
      toast.error('Maximum score is required for point-based evaluation');
      return;
    }

    if (newCriterion.evaluationType === EvaluationType.DISCRETE && 
        (!newCriterion.discreteValues || newCriterion.discreteValues.length < 2)) {
      toast.error('At least two discrete values are required for discrete evaluation');
      return;
    }
    
    setCriteria([
      ...criteria,
      {
        id: undefined, // Will be assigned by the database
        name: newCriterion.name,
        description: newCriterion.description,
        requiresJuryCourtesy: newCriterion.requiresJuryCourtesy,
        evaluationType: newCriterion.evaluationType,
        weight: newCriterion.weight,
        maxScore: newCriterion.evaluationType === EvaluationType.POINTS ? newCriterion.maxScore : null,
        discreteValues: newCriterion.evaluationType === EvaluationType.DISCRETE ? newCriterion.discreteValues : null
      }
    ]);

    setHasUnsavedChanges(true);
    setShowAddCriterionModal(false);
    toast.success('Criterion added');
  };

  // Remove a criterion
  const handleRemoveCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
    toast.success('Criterion removed');
  };

  // Save the template
  const handleSaveTemplate = async () => {
    if (criteria.length === 0) {
      toast.error('Please add at least one judging criterion');
      return;
    }

    if (isCreatingNew && !templateName) {
      toast.error('Template name is required');
      return;
    }
    
    // Validate total weight is 100%
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) {
      toast.error(`Criteria weights must sum to 100% (currently ${totalWeight}%)`);
      return;
    }

    setIsSaving(true);
    try {
      let templateId;
      
      if (isCreatingNew) {
        // Create a new template
        const newTemplate = await judgingTemplateApi.createJudgingTemplate({
          name: templateName,
          description: templateDescription,
          isDefault: isDefaultTemplate,
          contestType: contest.contestType,
          criteria: criteria
        });
        
        templateId = newTemplate.id;
        setCurrentTemplate(newTemplate);
        setIsCreatingNew(false);
        toast.success('New template created successfully');
      } else if (currentTemplate) {
        // Update existing template
        const updatedTemplate = await judgingTemplateApi.updateJudgingTemplate(
          currentTemplate.id as string,
          {
            name: currentTemplate.name,
            description: currentTemplate.description,
            isDefault: currentTemplate.isDefault,
            contestType: currentTemplate.contestType,
            criteria: criteria
          }
        );
        
        templateId = currentTemplate.id;
        setCurrentTemplate(updatedTemplate);
        toast.success('Template updated successfully');
      }
      
      // Assign template to contest if we have a template ID
      if (templateId) {
        await judgingTemplateApi.assignJudgingTemplate(contestId, templateId);
      }
      
      setHasUnsavedChanges(false);
      
      // Redirect back to contest details
      router.push(`/organizer/contests/${contestId}`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total weight
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  // Helper function to format evaluation type for display
  const formatEvaluationType = (type: EvaluationType) => {
    switch (type) {
      case EvaluationType.POINTS:
        return 'Points';
      case EvaluationType.TIME:
        return 'Time';
      case EvaluationType.DISCRETE:
        return 'Discrete Values';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading contest details...</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Contest not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="mr-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Judging Scheme</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure judging criteria for {contest.name}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleSaveTemplate} 
          disabled={isSaving || criteria.length === 0}
        >
          <SaveIcon className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save & Apply'}
        </Button>
      </div>

      {hasUnsavedChanges && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center text-yellow-800">
          <AlertCircleIcon className="h-5 w-5 mr-2 text-yellow-500" />
          <p className="text-sm">You have unsaved changes to this judging scheme.</p>
        </div>
      )}

      {!isCreatingNew && (
        <TemplateSelector 
          contestId={contestId}
          contestType={contest.contestType}
          onTemplateSelected={handleTemplateSelected}
          onCreateNew={handleCreateNew}
          currentTemplateId={currentTemplate?.id}
        />
      )}

      {isCreatingNew && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Judging Template</CardTitle>
            <CardDescription>
              Create a new template that can be reused for other contests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="e.g. Programming Contest Judging"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="templateDescription">Description (Optional)</Label>
                <Input
                  id="templateDescription"
                  placeholder="Brief description of this template"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <Switch
                id="isDefault"
                checked={isDefaultTemplate}
                onCheckedChange={setIsDefaultTemplate}
              />
              <Label htmlFor="isDefault">Set as default template for {contest.contestType.replace(/_/g, ' ')} contests</Label>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Judging Criteria</CardTitle>
            <CardDescription>
              {criteria.length === 0 
                ? "No criteria defined yet. Add criteria to define how submissions will be judged." 
                : `${criteria.length} criteria defined. Total weight: ${totalWeight}%`}
            </CardDescription>
          </div>
          <Button 
            onClick={openAddCriterionModal}
            variant="outline"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Criterion
          </Button>
        </CardHeader>
        <CardContent>
          {criteria.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No judging criteria defined yet</p>
              <Button onClick={openAddCriterionModal}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Criterion
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                {criteria.map((criterion, index) => (
                  <TableRow key={criterion.id || `new-${index}`}>
                    <TableCell className="font-medium">{criterion.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{criterion.description}</TableCell>
                    <TableCell>{formatEvaluationType(criterion.evaluationType)}</TableCell>
                    <TableCell>
                      {criterion.evaluationType === EvaluationType.POINTS && `${criterion.maxScore} points`}
                      {criterion.evaluationType === EvaluationType.TIME && 'Time-based'}
                      {criterion.evaluationType === EvaluationType.DISCRETE && 
                        criterion.discreteValues?.join(', ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={totalWeight === 100 ? "outline" : "destructive"}>
                        {criterion.weight}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {criterion.requiresJuryCourtesy ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCriterion(index)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {criteria.length > 0 && (
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <div className="text-sm">
              {totalWeight === 100 ? (
                <span className="text-green-600 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Weights sum to 100%
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <AlertCircleIcon className="h-4 w-4 mr-1" />
                  Weights must sum to 100% (currently {totalWeight}%)
                </span>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Add Criterion Modal */}
      <Dialog open={showAddCriterionModal} onOpenChange={setShowAddCriterionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Judging Criterion</DialogTitle>
            <DialogDescription>
              Define a new criterion for evaluating contest submissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="criterionName">Criterion Name</Label>
                <Input
                  id="criterionName"
                  placeholder="e.g. Technical Implementation"
                  value={newCriterion.name}
                  onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="evaluationType">Evaluation Type</Label>
                <Select
                  value={newCriterion.evaluationType}
                  onValueChange={(value) => setNewCriterion({ 
                    ...newCriterion, 
                    evaluationType: value as EvaluationType,
                    // Reset values based on type
                    ...(value === EvaluationType.POINTS ? { maxScore: 10, discreteValues: null } : {}),
                    ...(value === EvaluationType.TIME ? { maxScore: null, discreteValues: null } : {}),
                    ...(value === EvaluationType.DISCRETE ? { maxScore: null } : {})
                  })}
                >
                  <SelectTrigger id="evaluationType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EvaluationType.POINTS}>Points</SelectItem>
                    <SelectItem value={EvaluationType.TIME}>Time</SelectItem>
                    <SelectItem value={EvaluationType.DISCRETE}>Discrete Values</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="criterionDescription">Description</Label>
              <Textarea
                id="criterionDescription"
                placeholder="Explain what judges should look for when evaluating this criterion"
                value={newCriterion.description}
                onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newCriterion.evaluationType === EvaluationType.POINTS && (
                <div>
                  <Label htmlFor="maxScore">Maximum Score</Label>
                  <Input
                    id="maxScore"
                    type="number"
                    min="1"
                    value={newCriterion.maxScore || ''}
                    onChange={(e) => setNewCriterion({ 
                      ...newCriterion, 
                      maxScore: parseInt(e.target.value) || 0 
                    })}
                    placeholder="e.g. 10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The maximum number of points that can be awarded
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="weight">Weight (%)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="1"
                  max="100"
                  value={newCriterion.weight}
                  onChange={(e) => setNewCriterion({ 
                    ...newCriterion, 
                    weight: parseInt(e.target.value) || 0 
                  })}
                  placeholder="e.g. 20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How much this criterion contributes to the final score (all weights must sum to 100%)
                </p>
              </div>
            </div>
            
            {newCriterion.evaluationType === EvaluationType.DISCRETE && (
              <div>
                <Label>Discrete Values</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={discreteValueInput}
                    onChange={(e) => setDiscreteValueInput(e.target.value)}
                    placeholder="e.g. Excellent"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddDiscreteValue}
                    disabled={!discreteValueInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {newCriterion.discreteValues?.map((value, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {value}
                      <button
                        type="button"
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRemoveDiscreteValue(index)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                
                {(!newCriterion.discreteValues || newCriterion.discreteValues.length < 2) && (
                  <p className="text-xs text-amber-600 mt-2">
                    Add at least two discrete values (e.g. Excellent, Good, Fair, Poor)
                  </p>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                id="requiresJuryCourtesy"
                checked={newCriterion.requiresJuryCourtesy}
                onCheckedChange={(checked) => setNewCriterion({ 
                  ...newCriterion, 
                  requiresJuryCourtesy: checked 
                })}
              />
              <Label htmlFor="requiresJuryCourtesy">Requires Jury Courtesy</Label>
              <p className="text-xs text-muted-foreground ml-2">
                Flag this criterion for special consideration by the jury
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCriterionModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCriterion}
              disabled={!newCriterion.name || 
                (newCriterion.evaluationType === EvaluationType.POINTS && !newCriterion.maxScore) ||
                (newCriterion.evaluationType === EvaluationType.DISCRETE && 
                  (!newCriterion.discreteValues || newCriterion.discreteValues.length < 2))}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Criterion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Alert */}
      <AlertDialog open={showUnsavedChangesAlert} onOpenChange={setShowUnsavedChangesAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this judging scheme. Do you want to discard these changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsavedChangesConfirm}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
