'use client'

import React from 'react'
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface GenerationProgress {
  total: number
  current: number
  generated: number
  updated: number
  failed: number
  errors: Array<{ managerId: number; error: string; trainerName?: string }>
  isComplete: boolean
}

interface GenerationProgressModalProps {
  isOpen: boolean
  progress: GenerationProgress
  onClose: () => void
}

export default function GenerationProgressModal({ isOpen, progress, onClose }: GenerationProgressModalProps) {
  if (!isOpen) return null

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {progress.isComplete ? 'Generation Complete' : 'Generating Certificates'}
          </h3>
          {progress.isComplete && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {progress.current} of {progress.total}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-orange-600 h-3 rounded-full transition-all duration-300 ease-out flex items-center justify-end"
                style={{ width: `${progressPercentage}%` }}
              >
                {!progress.isComplete && progressPercentage > 0 && (
                  <Loader2 className="h-3 w-3 text-white mr-1 animate-spin" />
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium uppercase">Generated</p>
                  <p className="text-2xl font-bold text-green-900">{progress.generated}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium uppercase">Updated</p>
                  <p className="text-2xl font-bold text-blue-900">{progress.updated}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium uppercase">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{progress.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Status Message */}
          {!progress.isComplete && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating certificates... Please wait.</span>
            </div>
          )}

          {progress.isComplete && (
            <div className="mb-4">
              {progress.failed === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">All certificates generated successfully!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <span className="font-medium">
                    Generation complete with {progress.failed} error{progress.failed !== 1 ? 's' : ''}.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error List */}
          {progress.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Errors ({progress.errors.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {progress.errors.map((error, index) => (
                  <div
                    key={index}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">
                          Manager ID: {error.managerId}
                          {error.trainerName && ` (${error.trainerName})`}
                        </p>
                        <p className="text-xs text-red-700 mt-1">{error.error}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {progress.isComplete && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
