'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, User, Mail, Building2, CheckCircle } from 'lucide-react'

interface Template {
  id: number
  templateName: string
  targetType: string
}

interface CreateNonContestantCertModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateNonContestantCertModal({
  isOpen,
  onClose,
  onSuccess
}: CreateNonContestantCertModalProps) {
  // State
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    templateId: '',
    recipientName: '',
    recipientEmail: '',
    contingent_name: '',
    role: '',
    awardTitle: ''
  })

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      // Reset form when modal opens
      setFormData({
        templateId: '',
        recipientName: '',
        recipientEmail: '',
        contingent_name: '',
        role: '',
        awardTitle: ''
      })
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  // Fetch templates with NON_CONTEST_PARTICIPANT type
  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    setError(null)
    
    try {
      const response = await fetch('/api/certificates/templates?targetType=NON_CONTEST_PARTICIPANT&status=ACTIVE')
      
      if (!response.ok) {
        throw new Error('Failed to load templates')
      }
      
      const data = await response.json()
      setTemplates(data.templates || [])
      
      if (data.templates.length === 0) {
        setError('No templates available for non-contestant participants. Please create a template first.')
      }
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Failed to load templates. Please try again.')
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Handle form field changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  // Validate form
  const validateForm = () => {
    if (!formData.templateId) {
      setError('Please select a template')
      return false
    }
    if (!formData.recipientName.trim()) {
      setError('Recipient name is required')
      return false
    }
    if (formData.recipientEmail && !formData.recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address')
      return false
    }
    return true
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/certificates/create-non-contestant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create certificate')
      }

      setSuccess(true)
      
      // Close modal and refresh list after a short delay
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
      
    } catch (err) {
      console.error('Error creating certificate:', err)
      setError(err instanceof Error ? err.message : 'Failed to create certificate')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Certificate for Non-Contestant Participant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="templateId">Certificate Template *</Label>
            {isLoadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading templates...
              </div>
            ) : (
              <Select
                value={formData.templateId}
                onValueChange={(value) => handleChange('templateId', value)}
                disabled={templates.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="recipientName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Recipient Name *
            </Label>
            <Input
              id="recipientName"
              value={formData.recipientName}
              onChange={(e) => handleChange('recipientName', e.target.value)}
              placeholder="e.g., John Doe"
              disabled={isSubmitting}
            />
          </div>

          {/* Recipient Email */}
          <div className="space-y-2">
            <Label htmlFor="recipientEmail" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Recipient Email (Optional)
            </Label>
            <Input
              id="recipientEmail"
              type="email"
              value={formData.recipientEmail}
              onChange={(e) => handleChange('recipientEmail', e.target.value)}
              placeholder="e.g., john@example.com"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              Email for sending the certificate later
            </p>
          </div>

          {/* Institution/Contingent Name */}
          <div className="space-y-2">
            <Label htmlFor="contingent_name" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Institution/Organization (Optional)
            </Label>
            <Input
              id="contingent_name"
              value={formData.contingent_name}
              onChange={(e) => handleChange('contingent_name', e.target.value)}
              placeholder="e.g., ABC University"
              disabled={isSubmitting}
            />
          </div>

          {/* Role/Position */}
          <div className="space-y-2">
            <Label htmlFor="role">Role/Position (Optional)</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              placeholder="e.g., Observer, Volunteer, Guest Speaker"
              disabled={isSubmitting}
            />
          </div>

          {/* Award Title */}
          <div className="space-y-2">
            <Label htmlFor="awardTitle">Award/Recognition Title (Optional)</Label>
            <Input
              id="awardTitle"
              value={formData.awardTitle}
              onChange={(e) => handleChange('awardTitle', e.target.value)}
              placeholder="e.g., Certificate of Appreciation"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Certificate created successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingTemplates || templates.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Certificate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
