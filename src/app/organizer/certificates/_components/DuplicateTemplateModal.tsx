'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Template {
  id: number
  templateName: string
  targetType?: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 'QUIZ_WINNER' | 'TRAINERS' | 'CONTINGENT' | 'SCHOOL_WINNER'
  eventId?: number | null
  quizId?: number | null
  winnerRangeStart?: number | null
  winnerRangeEnd?: number | null
  prerequisites?: any
}

interface DuplicateTemplateModalProps {
  template: Template
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: {
    templateName: string
    targetType?: string
    eventId?: number | null
    quizId?: number | null
    winnerRangeStart?: number | null
    winnerRangeEnd?: number | null
    prerequisites?: any
  }) => Promise<void>
}

export function DuplicateTemplateModal({
  template,
  isOpen,
  onClose,
  onConfirm
}: DuplicateTemplateModalProps) {
  const [templateName, setTemplateName] = useState('')
  const [targetType, setTargetType] = useState<string>(template.targetType || 'GENERAL')
  const [eventId, setEventId] = useState<number | null>(template.eventId || null)
  const [quizId, setQuizId] = useState<number | null>(template.quizId || null)
  const [winnerRangeStart, setWinnerRangeStart] = useState<number | null>(template.winnerRangeStart || 1)
  const [winnerRangeEnd, setWinnerRangeEnd] = useState<number | null>(template.winnerRangeEnd || 3)
  const [prerequisites, setPrerequisites] = useState<any>(template.prerequisites || null)
  const [events, setEvents] = useState<{id: number, name: string}[]>([])
  const [quizzes, setQuizzes] = useState<{id: number, quiz_name: string}[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form with template values
      setTemplateName(`${template.templateName} (Copy)`)
      setTargetType(template.targetType || 'GENERAL')
      setEventId(template.eventId || null)
      setQuizId(template.quizId || null)
      setWinnerRangeStart(template.winnerRangeStart || 1)
      setWinnerRangeEnd(template.winnerRangeEnd || 3)
      setPrerequisites(template.prerequisites || null)
      
      // Fetch events and quizzes
      fetchEvents()
      fetchQuizzes()
    }
  }, [isOpen, template])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes')
      if (response.ok) {
        const data = await response.json()
        setQuizzes(data)
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onConfirm({
        templateName,
        targetType,
        eventId,
        quizId,
        winnerRangeStart,
        winnerRangeEnd,
        prerequisites
      })
      onClose()
    } catch (error) {
      console.error('Error duplicating template:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Duplicate Template Configuration</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Audience <span className="text-red-500">*</span>
            </label>
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value)
                // Reset related fields when changing target type
                if (e.target.value === 'GENERAL' || e.target.value === 'NON_CONTEST_PARTICIPANT' || e.target.value === 'TRAINERS' || e.target.value === 'CONTINGENT') {
                  setEventId(null)
                  setQuizId(null)
                  setWinnerRangeStart(null)
                  setWinnerRangeEnd(null)
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="GENERAL">General</option>
              <option value="EVENT_PARTICIPANT">Event Participant</option>
              <option value="EVENT_WINNER">Event Winner</option>
              <option value="NON_CONTEST_PARTICIPANT">Non-Contest Participant</option>
              <option value="QUIZ_PARTICIPANT">Quiz Participant</option>
              <option value="QUIZ_WINNER">Quiz Winner</option>
              <option value="TRAINERS">Trainers</option>
              <option value="CONTINGENT">Contingent</option>
              <option value="SCHOOL_WINNER">School Winners</option>
            </select>
          </div>

          {/* Event Selection */}
          {(targetType === 'EVENT_PARTICIPANT' || targetType === 'EVENT_WINNER') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Event <span className="text-red-500">*</span>
              </label>
              <select
                value={eventId || ''}
                onChange={(e) => setEventId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Select an Event --</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quiz Selection */}
          {(targetType === 'QUIZ_PARTICIPANT' || targetType === 'QUIZ_WINNER') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Quiz <span className="text-red-500">*</span>
              </label>
              <select
                value={quizId || ''}
                onChange={(e) => setQuizId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Select a Quiz --</option>
                {quizzes.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>{quiz.quiz_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Winner Range */}
          {(targetType === 'EVENT_WINNER' || targetType === 'QUIZ_WINNER') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Winner Range Start <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={winnerRangeStart || ''}
                  onChange={(e) => setWinnerRangeStart(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Winner Range End <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={winnerRangeEnd || ''}
                  onChange={(e) => setWinnerRangeEnd(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Description of target audience */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-gray-700">
              <strong>Target Audience:</strong>{' '}
              {targetType === 'GENERAL' && 'All certificate recipients (no specific target)'}
              {targetType === 'EVENT_PARTICIPANT' && eventId && `Participants of ${events.find(e => e.id === eventId)?.name || 'selected event'}`}
              {targetType === 'EVENT_PARTICIPANT' && !eventId && 'Event participants (please select an event)'}
              {targetType === 'EVENT_WINNER' && eventId && winnerRangeStart && winnerRangeEnd && 
                `Top performers (ranks ${winnerRangeStart}-${winnerRangeEnd}) of ${events.find(e => e.id === eventId)?.name || 'selected event'}`}
              {targetType === 'EVENT_WINNER' && (!eventId || !winnerRangeStart || !winnerRangeEnd) && 
                'Event winners (please complete all fields)'}
              {targetType === 'NON_CONTEST_PARTICIPANT' && 
                'Non-competing participants (observers, guests, volunteers, etc.)'}
              {targetType === 'QUIZ_PARTICIPANT' && quizId && `Participants who completed ${quizzes.find(q => q.id === quizId)?.quiz_name || 'selected quiz'}`}
              {targetType === 'QUIZ_PARTICIPANT' && !quizId && 'Participants of selected quiz (please select a quiz)'}
              {targetType === 'QUIZ_WINNER' && quizId && winnerRangeStart && winnerRangeEnd && 
                `Top performers (ranks ${winnerRangeStart}-${winnerRangeEnd}) of ${quizzes.find(q => q.id === quizId)?.quiz_name || 'selected quiz'}`}
              {targetType === 'QUIZ_WINNER' && (!quizId || !winnerRangeStart || !winnerRangeEnd) && 
                'Quiz winners (please complete all fields)'}
              {targetType === 'TRAINERS' && 'Trainers and instructors'}
              {targetType === 'CONTINGENT' && 'Contingents (team/group level certificates)'}
              {targetType === 'SCHOOL_WINNER' && 'School-level achievement winners'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Duplicating...' : 'Duplicate Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
