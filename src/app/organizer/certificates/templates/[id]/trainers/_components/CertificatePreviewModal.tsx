'use client'

import React from 'react'
import { X, Download, ExternalLink } from 'lucide-react'

interface CertificatePreviewModalProps {
  isOpen: boolean
  certificateUrl: string
  trainerName: string
  serialNumber: string | null
  onClose: () => void
  onDownload: () => void
}

export default function CertificatePreviewModal({
  isOpen,
  certificateUrl,
  trainerName,
  serialNumber,
  onClose,
  onDownload
}: CertificatePreviewModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Certificate Preview
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {trainerName}
              {serialNumber && (
                <span className="ml-2 text-xs text-gray-500">
                  Serial: {serialNumber}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            src={certificateUrl}
            className="w-full h-full border-0"
            title={`Certificate for ${trainerName}`}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Certificate for {trainerName}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
