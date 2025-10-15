'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EditCertificateModalProps {
  isOpen: boolean
  onClose: () => void
  certificateId: number
  onSuccess?: () => void
}

export function EditCertificateModal({
  isOpen,
  onClose,
  certificateId,
  onSuccess
}: EditCertificateModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [certificate, setCertificate] = useState<any>(null)
  
  // Form fields
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientType, setRecipientType] = useState<'PARTICIPANT' | 'CONTESTANT' | 'JUDGE' | 'ORGANIZER'>('PARTICIPANT')
  const [contingentName, setContingentName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [icNumber, setIcNumber] = useState('')
  const [contestName, setContestName] = useState('')
  const [awardTitle, setAwardTitle] = useState('')

  useEffect(() => {
    if (isOpen && certificateId) {
      fetchCertificateData()
    }
  }, [isOpen, certificateId])

  const fetchCertificateData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/certificates/${certificateId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch certificate')
      }
      const data = await response.json()
      setCertificate(data)
      
      // Populate form fields
      setRecipientName(data.recipientName || '')
      setRecipientEmail(data.recipientEmail || '')
      setRecipientType(data.recipientType || 'PARTICIPANT')
      setContingentName(data.contingent_name || '')
      setTeamName(data.team_name || '')
      setIcNumber(data.ic_number || '')
      setContestName(data.contestName || '')
      setAwardTitle(data.awardTitle || '')
    } catch (err) {
      console.error('Error fetching certificate:', err)
      setError(err instanceof Error ? err.message : 'Failed to load certificate')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/certificates/${certificateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientName,
          recipientEmail: recipientEmail || null,
          recipientType,
          contingent_name: contingentName || null,
          team_name: teamName || null,
          ic_number: icNumber || null,
          contestName: contestName || null,
          awardTitle: awardTitle || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update certificate')
      }

      // Success
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      console.error('Error updating certificate:', err)
      setError(err instanceof Error ? err.message : 'Failed to update certificate')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Edit Certificate Details</h2>
            {certificate && (
              <p className="text-sm text-gray-500 mt-1">
                Serial: {certificate.serialNumber || 'Not assigned'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            disabled={isSaving}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600">Loading certificate...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Name */}
              <div>
                <Label htmlFor="recipientName">Recipient Name *</Label>
                <Input
                  id="recipientName"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="Enter recipient name"
                />
              </div>

              {/* Recipient Email */}
              <div>
                <Label htmlFor="recipientEmail">Recipient Email</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="mt-1"
                  placeholder="recipient@example.com"
                />
              </div>

              {/* Recipient Type */}
              <div>
                <Label htmlFor="recipientType">Recipient Type *</Label>
                <Select value={recipientType} onValueChange={(value: any) => setRecipientType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARTICIPANT">Participant</SelectItem>
                    <SelectItem value="CONTESTANT">Contestant</SelectItem>
                    <SelectItem value="JUDGE">Judge</SelectItem>
                    <SelectItem value="ORGANIZER">Organizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contingent Name */}
              <div>
                <Label htmlFor="contingentName">Contingent Name</Label>
                <Input
                  id="contingentName"
                  type="text"
                  value={contingentName}
                  onChange={(e) => setContingentName(e.target.value)}
                  className="mt-1"
                  placeholder="University name or organization"
                />
              </div>

              {/* Team Name */}
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="mt-1"
                  placeholder="Team name"
                />
              </div>

              {/* IC Number */}
              <div>
                <Label htmlFor="icNumber">IC Number</Label>
                <Input
                  id="icNumber"
                  type="text"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  className="mt-1"
                  placeholder="e.g., 990101-10-1234"
                />
              </div>

              {/* Contest Name */}
              <div>
                <Label htmlFor="contestName">Contest Name</Label>
                <Input
                  id="contestName"
                  type="text"
                  value={contestName}
                  onChange={(e) => setContestName(e.target.value)}
                  className="mt-1"
                  placeholder="Contest or event name"
                />
              </div>

              {/* Award Title */}
              <div>
                <Label htmlFor="awardTitle">Award Title</Label>
                <Input
                  id="awardTitle"
                  type="text"
                  value={awardTitle}
                  onChange={(e) => setAwardTitle(e.target.value)}
                  className="mt-1"
                  placeholder="e.g., Gold Medal, Best Innovation"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isLoading || !recipientName}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
