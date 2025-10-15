'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, X, Maximize, Minimize } from 'lucide-react'

interface ViewCertificateModalProps {
  isOpen: boolean
  onClose: () => void
  certificateId: number
}

export function ViewCertificateModal({
  isOpen,
  onClose,
  certificateId
}: ViewCertificateModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [template, setTemplate] = useState<any>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const certificatePreviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && certificateId) {
      fetchCertificateData()
    }
  }, [isOpen, certificateId])

  const fetchCertificateData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch certificate details
      const certResponse = await fetch(`/api/certificates/${certificateId}`)
      if (!certResponse.ok) {
        throw new Error('Failed to fetch certificate')
      }
      const certData = await certResponse.json()
      setCertificate(certData)

      // Use template from certificate data if available
      if (certData.template) {
        setTemplate(certData.template)
      } else {
        // Fallback: Fetch template details separately
        const templateResponse = await fetch(`/api/certificates/templates/${certData.templateId}`)
        if (!templateResponse.ok) {
          throw new Error('Failed to fetch template')
        }
        const templateData = await templateResponse.json()
        setTemplate(templateData)
      }
    } catch (err) {
      console.error('Error fetching certificate data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load certificate')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to replace dynamic placeholders with certificate data
  const replacePlaceholder = (placeholder: string): string => {
    if (!certificate) return placeholder

    const key = placeholder.replace(/{{|}}/g, '').trim()
    
    // Map certificate fields to placeholder keys
    const dataMap: Record<string, any> = {
      'recipient_name': certificate.recipientName,
      'recipient_email': certificate.recipientEmail || '',
      'award_title': certificate.awardTitle || '',
      'contingent_name': certificate.contingent_name || '',
      'team_name': certificate.team_name || '',
      'ic_number': certificate.ic_number || '',
      'contest_name': certificate.contestName || '',
      'issue_date': certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : new Date().toLocaleDateString(),
      'unique_code': certificate.uniqueCode || '',
      'serial_number': certificate.serialNumber || ''
    }

    const value = dataMap[key]
    
    // If value exists and is not empty, return it; otherwise return empty string
    return (value !== null && value !== undefined && value !== '') ? value : ''
  }

  if (!isOpen) return null

  const paperSize = template?.configuration?.canvas || { width: 842, height: 595 }
  const elements = template?.configuration?.elements || []
  const pdfUrl = template?.basePdfPath || null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className={`bg-white rounded-lg shadow-xl ${isMaximized ? 'w-[99vw] h-[99vh]' : 'w-[95vw] max-w-7xl h-[90vh]'} flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Certificate Preview</h2>
            {certificate && (
              <p className="text-sm text-gray-500 mt-1">
                {certificate.recipientName} • {certificate.uniqueCode}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Maximize/Minimize Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-gray-600">Loading certificate...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-red-600">
                <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          ) : (
            <div className={`h-full ${isMaximized ? 'p-2' : 'p-4'} flex justify-center overflow-auto bg-gray-50`}>
              <div 
                ref={certificatePreviewRef} 
                className="relative bg-white shadow-lg" 
                style={{
                  width: `${paperSize.width}px`, 
                  minHeight: `${paperSize.height}px`,
                  transform: isMaximized ? 'scale(1.2)' : 'none',
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s ease'
                }}
              >
                {/* PDF Background */}
                {pdfUrl && (
                  <iframe
                    src={`/api/certificates/serve-pdf?path=${encodeURIComponent(pdfUrl)}#pagemode=none&sidebar=0&navpanes=0&scrollbar=0`}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none', width: '100%' }}
                  />
                )}

                {/* Certificate Elements */}
                {elements.map((element: any) => (
                  <div
                    key={element.id}
                    className="absolute"
                    style={{
                      left: `${element.position.x}px`,
                      top: `${element.position.y}px`,
                      zIndex: element.layer
                    }}
                  >
                    {element.type === 'static_text' && (
                      <div
                        style={{
                          fontFamily: element.style?.font_family || 'Arial',
                          fontSize: `${parseFloat(element.style?.font_size) || 16}px`,
                          fontWeight: element.style?.font_weight || 'normal',
                          color: element.style?.color || '#000000',
                          textAlign: element.style?.align || 'left',
                          position: 'relative',
                          transform: element.text_anchor === 'middle' ? 'translateX(-50%)' : 
                                    element.text_anchor === 'end' ? 'translateX(-100%)' : 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {element.content}
                      </div>
                    )}

                    {element.type === 'dynamic_text' && (
                      <div
                        style={{
                          fontFamily: element.style?.font_family || 'Arial',
                          fontSize: `${parseFloat(element.style?.font_size) || 16}px`,
                          fontWeight: element.style?.font_weight || 'normal',
                          color: element.style?.color || '#000000',
                          textAlign: element.style?.align || 'left',
                          position: 'relative',
                          transform: element.text_anchor === 'middle' ? 'translateX(-50%)' : 
                                    element.text_anchor === 'end' ? 'translateX(-100%)' : 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {element.prefix && (
                          <span style={{ color: element.style?.color || '#000000' }}>
                            {element.prefix}
                          </span>
                        )}
                        <span style={{ color: element.style?.color || '#000000' }}>
                          {replacePlaceholder(element.placeholder || '')}
                        </span>
                      </div>
                    )}

                    {element.type === 'image' && element.source && (
                      <img 
                        src={element.source} 
                        alt="Certificate element"
                        style={{
                          width: `${element.dimensions?.width || 100}px`,
                          height: `${element.dimensions?.height || 100}px`,
                          objectFit: 'contain'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {certificate && (
                <div className="space-y-1">
                  <p><span className="font-medium">Status:</span> <span className="px-2 py-1 bg-gray-100 rounded text-xs">{certificate.status}</span></p>
                  <p><span className="font-medium">Serial Number:</span> {certificate.serialNumber || 'Not assigned'}</p>
                  {certificate.issuedAt && (
                    <p><span className="font-medium">Issued:</span> {new Date(certificate.issuedAt).toLocaleDateString()}</p>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
